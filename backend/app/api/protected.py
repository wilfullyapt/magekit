import os
import re
from datetime import datetime
from typing import Optional

import ffmpeg
from pydantic import BaseModel
from fastapi import APIRouter, BackgroundTasks
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import get_settings
from app.core.logger import get_videos_logger
from app.db.base import get_db, get_db_context
from app.db.models import User, Extraction
from app.core.websocket_manager import get_websocket_manager
from app.video.spotify import SpotifyWorker


from fastapi import APIRouter, Depends, HTTPException, status
from app.tasks.extraction import process_extraction
from app.core.redis import get_redis
from app.db.base import get_db
from app.db.models import User, Extraction

####################################################
#############     MDOELS     #######################
####################################################

class ExtractionCreate(BaseModel):
    youtubeUrl: str
    startTime: str
    endTime: str
    notes: str
    generateCaptions: bool

####################################################
#############     ACTORS     #######################
####################################################

router = APIRouter()
logger = get_videos_logger()
settings = get_settings()

####################################################
#############     HELPER FUNCTIONS     #############
####################################################

def time_to_seconds(time_str: str) -> int:
    """Convert HH:MM:SS or MM:SS to seconds"""
    parts = time_str.split(':')
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])

def process_extraction(user_id: int, extraction_id: int, verbose: bool=False):
    """Single function handling entire extraction process"""
    ws_manager = get_websocket_manager()

    def get_exception_meesage(e):
        import sys, traceback
        exc_type, exc_value, exc_traceback = sys.exc_info()
        filename = traceback.extract_tb(exc_traceback)[-1].filename
        line_number = traceback.extract_tb(exc_traceback)[-1].lineno
        return f"{exc_type.__name__}: {str(e)}. {filename}:Line {line_number}"

    def send_status_update(
        status: str, 
        progress: int, 
        message: Optional[str] = None,
        error: Optional[str] = None
    ):
        """Send properly formatted WebSocket update"""
        if verbose:
            print(f"Status: {status}   | {progress}%")
            print(message)
        else:
            update = {
                "status": status,
                "progress": progress,
                "message": message,
                "error": error
            }
            ws_manager.send_extraction_update(
                user_id=user_id,
                extraction_id=extraction_id,
                status=status,
                progress=progress,
                message=message,
                error=error
            )

    with get_db_context() as db:
        extraction = db.query(Extraction).get(extraction_id)
        if not extraction:
            return

        try:
            send_status_update("processing", 0, "Starting extraction...")
            downloader = SpotifyWorker(settings.SPOTIFY_COOKIES_FILE)

            try:
                send_status_update("downloading", 25, "Downloading content")
#               video_path = downloader.download_content(url=extraction.youtube_url)
                video_path = downloader._download_spotify_content(url=extraction.youtube_url)

                extraction.file_path = str(video_path)
                db.commit()

                if verbose:
                    print(f"File downloaded: {video_path}")

            except Exception as e:
                logger.error(f"Download failed: {get_exception_meesage(e)}")
                extraction.status = "failed"
                db.commit()
                raise

            try:
                start_seconds = time_to_seconds(extraction.start_time)
                end_seconds = time_to_seconds(extraction.end_time)
                duration = end_seconds - start_seconds

                dt_tag = datetime.now().strftime("%Y%m%d-%H%M%S")
                output_file = downloader.dest_dir / f"clip_{extraction_id}_{dt_tag}.mp4"

                send_status_update("processing", 75, "Clipping video...")

                stream = ffmpeg.input(str(video_path))
                stream = ffmpeg.output(
                    stream,
                    str(output_file),
                    ss=start_seconds,
                    t=duration,
                    acodec='copy',
                    vcodec='copy'
                )
                ffmpeg.run(stream, overwrite_output=True, capture_stderr=True)

                extraction.status = "completed"
                extraction.file_path = str(output_file)
                db.commit()

                send_status_update("completed", 100, "Extraction complete!")

            except Exception as e:
                logger.error(f"Processing failed: {get_exception_meesage(e)}")
                extraction.status = "failed"
                db.commit()
                raise

        except Exception as e:
            msg = get_exception_meesage(e)
            logger.error(f"Extraction failed: {msg}")
            send_status_update("failed", 0, f"Extraction failed: {msg}")
            raise

####################################################
#############     ROUTER     #######################
####################################################

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    try:
        total_users = db.query(User).count()

        total_extractions = db.query(Extraction).count()
        pending_extractions = db.query(Extraction).filter(Extraction.status == "pending").count()
        completed_extractions = db.query(Extraction).filter(Extraction.status == "completed").count()
        failed_extractions = db.query(Extraction).filter(Extraction.status == "failed").count()

        user_extractions = db.query(Extraction).filter(Extraction.creator_id == current_user.id).count()
        user_completed = db.query(Extraction).filter(
            Extraction.creator_id == current_user.id,
            Extraction.status == "completed"
        ).count()

        recent_extractions = db.query(Extraction)\
            .order_by(Extraction.extraction_datetime.desc())\
            .limit(5)\
            .all()

        return {
            "system_stats": {
                "total_users": total_users,
                "total_extractions": total_extractions,
                "pending_extractions": pending_extractions,
                "completed_extractions": completed_extractions,
                "failed_extractions": failed_extractions
            },
            "user_stats": {
                "total_extractions": user_extractions,
                "completed_extractions": user_completed
            },
            "recent_activity": [{
                "id": extraction.id,
                "status": extraction.status,
                "youtube_url": extraction.youtube_url,
                "extraction_datetime": extraction.extraction_datetime,
                "creator_id": extraction.creator_id
            } for extraction in recent_extractions]
        }
    except Exception as e:
        logger.critical(f"Error while retrieving the dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard stats: {str(e)}"
        )


router = APIRouter()

@router.post("/extract", status_code=status.HTTP_201_CREATED)
async def create_extraction(
    extraction: ExtractionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Validation logic here...
        
        new_extraction = Extraction(
            youtube_url=extraction.youtubeUrl,
            start_time=extraction.startTime,
            end_time=extraction.endTime,
            notes=extraction.notes[:300] if extraction.notes else None,
            status="pending",
            captions_generated=extraction.generateCaptions,
            creator_id=current_user.id
        )

        db.add(new_extraction)
        db.commit()
        db.refresh(new_extraction)

        # Start Celery task
        task = process_extraction.delay(
            user_id=current_user.id,
            extraction_id=new_extraction.id
        )

        return {
            "message": "Extraction started",
            "extraction_id": new_extraction.id,
            "task_id": task.id
        }

    except Exception as e:
        logger.critical(f"Error on Extraction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/videos")
async def get_videos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """Get videos with real-time status"""
    try:
        query = db.query(Extraction)
        if current_user.email != settings.ADMIN:
            query = query.filter(Extraction.creator_id == current_user.id)

        videos = query.order_by(Extraction.extraction_datetime.desc()).all()

        # Update with real-time status from Redis
        result = []
        for video in videos:
            video_dict = {
                "id": video.id,
                "youtube_url": video.youtube_url,
                "video_title": video.video_title,
                "start_time": video.start_time,
                "end_time": video.end_time,
                "notes": video.notes,
                "status": video.status,
                "progress": video.progress,
                "extraction_datetime": video.extraction_datetime,
                "creator_name": db.query(User).get(video.creator_id).name
            }

            # Check Redis for real-time status
            redis_status = await redis.get(f'extraction:{video.id}:status')
            if redis_status:
                status_data = json.loads(redis_status)
                video_dict.update({
                    'status': status_data['status'],
                    'progress': status_data['progress']
                })

            result.append(video_dict)

        return result

    except Exception as e:
        logger.error(f"Error retrieving videos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/videos/status/{extraction_id}")
async def get_videos_status(
    extraction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the status for an extraction id"""
    try:
        extraction = db.query(Extraction).filter(Extraction.id == extraction_id).first()

        if current_user.email != settings.ADMIN:
            query = query.filter(Extraction.creator_id == current_user.id)

        has_in_progress = db.query(query.exists()).scalar()

        return {
            "has_in_progress": has_in_progress
        }

    except Exception as e:
        logger.error(f"Error checking video status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.delete("/videos/{video_id}")
async def delete_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a video extraction if it belongs to the current user."""
    try:
        # Find the video and verify ownership
        video = db.query(Extraction).filter(
            Extraction.id == video_id,
            Extraction.creator_id == current_user.id
        ).first()

        if not video:
            print(f"DELETE: Video not found {video_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )

        # Delete the file if it exists
        if video.file_path and os.path.exists(video.file_path):
            try:
                os.remove(video.file_path)
            except OSError as e:
                print(f"Error deleting file: {str(e)}")
                # Continue with deletion even if file removal fails

        # Delete the database record
        db.delete(video)
        db.commit()

        return {"message": "Video deleted successfully"}

    except Exception as e:
        logger.critical(f"User '{current_user}' failed to delete {video_id}")
        return {"message": "Video deletion unsuccessful"}

@router.post("/videos/{video_id}/redownload")
async def redownload_video(
    video_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Redownload a specific video for the current user"""
    try:
        old_video = db.query(Extraction).filter(
            Extraction.id == video_id,
            Extraction.creator_id == current_user.id
        ).first()

        if not old_video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )

        new_video = Extraction(
            youtube_url=old_video.youtube_url,
            start_time=old_video.start_time,
            end_time=old_video.end_time,
            notes=old_video.notes,
            status="pending",
            creator_id=current_user.id,
            captions_generated=old_video.captions_generated
        )

        db.delete(old_video)
        db.add(new_video)
        db.commit()
        db.refresh(new_video)

        worker = ExtractionWorker(db)
        background_tasks.add_task(worker.process_extraction, new_video.id)

        return {
            "message": "Redownload started",
            "new_id": new_video.id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error: {str(e)}"
        )

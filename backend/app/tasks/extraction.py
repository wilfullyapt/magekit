# backend/app/tasks/extraction.py

import json
from celery import Task
from app.core.celery import celery_app
from app.core.redis import get_redis_pool
from app.db.base import get_db_context
from app.video.spotify import SpotifyWorker
from app.core.config import get_settings

settings = get_settings()

class ExtractionTask(Task):
    """Base task for extractions with progress tracking"""
    _redis = None

    @property
    def redis(self):
        if self._redis is None:
            self._redis = get_redis_pool()
        return self._redis

    def update_progress(self, extraction_id: int, status: str, progress: int = None, message: str = None, error: str = None):
        """Update extraction progress in Redis and notify clients"""
        update = {
            'type': 'extraction_update',
            'extraction_id': extraction_id,
            'status': status,
            'progress': progress,
            'message': message,
            'error': error
        }
        
        # Store current state in Redis
        self.redis.set(
            f'extraction:{extraction_id}:status',
            json.dumps(update),
            ex=3600  # expire after 1 hour
        )
        
        # Publish update to channel
        self.redis.publish(
            f'extraction:{extraction_id}',
            json.dumps(update)
        )

@celery_app.task(bind=True, base=ExtractionTask)
def process_extraction(self, user_id: int, extraction_id: int):
    """Process extraction as Celery task"""
    try:
        with get_db_context() as db:
            extraction = db.query(Extraction).get(extraction_id)
            if not extraction:
                return

            try:
                self.update_progress(extraction_id, "processing", 0, "Starting extraction...")
                downloader = SpotifyWorker(settings.SPOTIFY_COOKIES_FILE)

                # Download phase
                self.update_progress(extraction_id, "downloading", 25, "Downloading content")
                video_path = downloader._download_spotify_content(url=extraction.youtube_url)
                extraction.file_path = str(video_path)
                db.commit()

                # Processing phase
                self.update_progress(extraction_id, "processing", 75, "Processing content...")
                start_seconds = time_to_seconds(extraction.start_time)
                end_seconds = time_to_seconds(extraction.end_time)
                duration = end_seconds - start_seconds

                output_file = process_video(
                    video_path,
                    start_seconds,
                    duration,
                    extraction_id
                )

                extraction.status = "completed"
                extraction.file_path = str(output_file)
                db.commit()

                self.update_progress(extraction_id, "completed", 100, "Extraction complete!")

            except Exception as e:
                msg = f"Extraction failed: {str(e)}"
                logger.error(msg)
                extraction.status = "failed"
                db.commit()
                self.update_progress(extraction_id, "failed", 0, error=msg)
                raise

    except Exception as e:
        logger.error(f"Task error: {str(e)}")
        self.update_progress(extraction_id, "failed", 0, error=str(e))
        raise

def process_video(video_path, start_seconds, duration, extraction_id):
    """Process video using ffmpeg"""
    try:
        dt_tag = datetime.now().strftime("%Y%m%d-%H%M%S")
        output_file = Path(video_path).parent / f"clip_{extraction_id}_{dt_tag}.mp4"

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

        return output_file
    except Exception as e:
        raise Exception(f"Video processing failed: {str(e)}")

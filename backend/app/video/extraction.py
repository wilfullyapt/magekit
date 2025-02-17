# backend/app/video/extraction.py

from datetime import datetime
from pathlib import Path
from typing import Type

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import Extraction, ExtractionStatus
from app.core.websocket_manager import get_websocket_manager
from .base import BaseWorker, ProgressTracker
from .spotify import SpotifyWorker

settings = get_settings()

class ExtractionManager:
    """
    Manages the extraction process workflow.
    Coordinates between the worker, database, and WebSocket updates.
    """

    def __init__(self, db: Session, worker_class: Type[BaseWorker] = SpotifyWorker):
        self.db = db
        self.worker_class = worker_class
        self.ws_manager = get_websocket_manager()

    async def process_extraction(self, extraction_id: int):
        """Main extraction process coordinator"""
        extraction = self.db.query(Extraction).get(extraction_id)
        if not extraction:
            return

        # Initialize progress tracking
        progress = ProgressTracker(extraction)
        
        # Initialize worker
        worker = self.worker_class(
            cookies_path=settings.SPOTIFY_COOKIES_FILE
        )

        try:
            # Start extraction
            await progress.update_progress(
                status=ExtractionStatus.PENDING,
                progress=0,
                message="Starting extraction..."
            )

            # Download phase
            try:
                await progress.update_progress(
                    status=ExtractionStatus.DOWNLOADING,
                    progress=25,
                    message="Downloading content..."
                )
                
                input_path = await worker.download_content(extraction.youtube_url)
                extraction.file_path = str(input_path)
                self.db.commit()

            except Exception as e:
                await progress.update_progress(
                    status=ExtractionStatus.FAILED,
                    error=f"Download failed: {str(e)}"
                )
                await worker.cleanup()
                return

            # Processing phase
            try:
                await progress.update_progress(
                    status=ExtractionStatus.PROCESSING,
                    progress=75,
                    message="Processing content..."
                )

                # Create output path
                dt_tag = datetime.now().strftime("%Y%m%d-%H%M%S")
                output_path = Path(input_path).parent / f"clip_{extraction_id}_{dt_tag}.mp4"

                # Process content
                final_path = await worker.process_content(
                    input_path=input_path,
                    output_path=output_path,
                    start_time=extraction.start_time,
                    end_time=extraction.end_time
                )

                # Update extraction record
                extraction.file_path = str(final_path)
                extraction.status = ExtractionStatus.COMPLETED
                self.db.commit()

                await progress.update_progress(
                    status=ExtractionStatus.COMPLETED,
                    progress=100,
                    message="Extraction complete!"
                )

            except Exception as e:
                await progress.update_progress(
                    status=ExtractionStatus.FAILED,
                    error=f"Processing failed: {str(e)}"
                )
                raise

        except Exception as e:
            await progress.update_progress(
                status=ExtractionStatus.FAILED,
                error=f"Extraction failed: {str(e)}"
            )

        finally:
            # Always cleanup
            await worker.cleanup()
            self.ws_manager.decrement_extraction_count(extraction.creator_id)

    @classmethod
    async def start_extraction(cls, db: Session, extraction_id: int):
        """Factory method to start an extraction process"""
        manager = cls(db)
        await manager.process_extraction(extraction_id)

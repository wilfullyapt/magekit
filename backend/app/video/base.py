# backend/app/video/base.py
# Base components for video extraction

import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional
from datetime import datetime

from app.db.models import Extraction, ExtractionStatus
from app.core.websocket_manager import get_websocket_manager

class BaseWorker(ABC):
    """Base class for content download and extraction"""

    def __init__(self, dest_dir: Optional[Path] = None):
        if not dest_dir:
            dest_dir = Path(__file__).parent.parent.parent / "extractions"
        self.dest_dir = dest_dir
        self.temp_dir = dest_dir / "temp"
        self.temp_files = []

    def _ensure_directories(self):
        """Ensure necessary directories exist"""
        self.dest_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def _cleanup_temp(self):
        """Clean temporary files and directories"""
        for file_path in self.temp_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Failed to cleanup file {file_path}: {e}")
        self.temp_files = []

    @abstractmethod
    async def download_content(self, url: str) -> Path:
        """Download content from source"""
        pass

    @abstractmethod
    async def process_content(self, input_path: Path, output_path: Path, start_time: str, end_time: str) -> Path:
        """Process downloaded content"""
        pass

    async def cleanup(self):
        """Cleanup after processing"""
        self._cleanup_temp()

class ProgressTracker:
    """Handles progress updates and WebSocket communication"""

    def __init__(self, extraction: Extraction):
        self.extraction = extraction
        self.ws_manager = get_websocket_manager()

    async def update_progress(
        self,
        status: ExtractionStatus,
        progress: Optional[int] = None,
        message: Optional[str] = None,
        error: Optional[str] = None
    ):
        """Update extraction progress and notify via WebSocket"""
        # Update extraction record
        self.extraction.status = status
        if progress is not None:
            self.extraction.progress = progress
        if error:
            self.extraction.error_message = error
        self.extraction.last_updated = datetime.now()

        # Send WebSocket update
        await self.ws_manager.send_extraction_update(
            user_id=self.extraction.creator_id,
            extraction_id=self.extraction.id,
            status=status,
            progress=progress,
            message=message,
            error=error
        )

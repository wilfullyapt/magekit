# backend/app/db/models.py
from datetime import datetime
from enum import Enum
from typing import Optional
from zoneinfo import ZoneInfo
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class ExtractionStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    auth_token = Column(String, nullable=True)
    active_extractions = Column(Integer, default=0)

class Extraction(Base):
    __tablename__ = "extractions"

    id = Column(Integer, primary_key=True, index=True)
    root_url = Column(String, nullable=False)
    video_title = Column(String, nullable=True)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    notes = Column(Text(300))
    summary = Column(Text(300))

    # Enhanced status tracking
    status = Column(String, default=ExtractionStatus.PENDING)
    error_message = Column(Text, nullable=True)
    progress = Column(Integer, default=0)
    retry_count = Column(Integer, default=0)
    process_reference = Column(String, nullable=True)

    # Metadata
    extraction_datetime = Column(DateTime, default=datetime.now(ZoneInfo('UTC')))
    last_updated = Column(DateTime, default=datetime.now(ZoneInfo('UTC')), onupdate=datetime.now(ZoneInfo('UTC')))

    # File management
    file_path = Column(String, nullable=True)
    temp_files = Column(JSON, default=list)

    # Settings and relations
    captions_generated = Column(Boolean, default=False)
    creator_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User", backref="extractions")

    def update_status(self, status: ExtractionStatus, error: Optional[str] = None, progress: Optional[int] = None):
        """Update extraction status with proper error handling"""
        self.status = status
        if error:
            self.error_message = error
        if progress is not None:
            self.progress = min(100, max(0, progress))
        self.last_updated = datetime.now(ZoneInfo('UTC'))

    def to_dict(self):
        """Convert extraction to dict for WebSocket messages"""
        return {
            "id": self.id,
            "status": self.status,
            "progress": self.progress,
            "error_message": self.error_message,
            "youtube_url": self.youtube_url,
            "video_title": self.video_title,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "notes": self.notes,
            "extraction_datetime": self.extraction_datetime.isoformat(),
            "last_updated": self.last_updated.isoformat()
        }

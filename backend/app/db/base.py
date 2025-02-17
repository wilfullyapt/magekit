import os
from datetime import datetime, timedelta
from typing import Generator
from zoneinfo import ZoneInfo
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.models import Base, Extraction

settings = get_settings()

engine = create_engine(
    settings.SQLITE_DATABASE_URL,
    connect_args=settings.DB_CONNECT_ARGS,
    pool_size=20,
    max_overflow=20,
    pool_timeout=60
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_db_context():
    """Context manager for database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    from app.core.logger import get_app_logger

    logger = get_app_logger()

    logger.info("Initializing database...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.critical(f"Error creating database tables: {str(e)}")
        raise

async def cleanup_old_extractions() -> None:
    """
    Clean up tasks include deleting local files older than 'days_limit'
    and update the database records
    """

    cleanup_date = datetime.now(ZoneInfo('UCT')) - timedelta(days=20)
    db = get_db()

    try:
        old_extractions = db.query(Extraction).filter(
            Extraction.extraction_datetime < cleanup_date,
            Extraction.status == "completed",
            Extraction.file_path.isnot(None)
        ).all()

        for extraction in old_extractions:

            if extraction.file_path and os.path.exists(extraction.file_path):
                try:
                    os.remove(extraction.file_path)
                except OSError:
                    print(f"Failed to delete file: {extraction.file_path}")

            extraction.status = "expired"
            extraction.file_path = None

        db.commit()
    finally:
        db.close()

import logging
from logging.handlers import RotatingFileHandler
import os
from functools import lru_cache
from .config import get_settings

settings = get_settings()

class LoggerConfig:
    """Centralized logger configuration"""

    @staticmethod
    def setup_logger(name: str, log_file: str):
        """Setup a new logger instance"""
        # Ensure logs directory exists
        log_dir = os.path.join(os.getcwd(), 'logs')
        os.makedirs(log_dir, exist_ok=True)

        logger = logging.getLogger(name)
        logger.setLevel(logging.INFO)

        # Only add handlers if they haven't been added already
        if not logger.handlers:
            # Rotating file handler
            file_handler = RotatingFileHandler(
                os.path.join(log_dir, log_file),
                maxBytes=10*1024*1024,  # 10 MB
                backupCount=5
            )

            # Console handler
            console_handler = logging.StreamHandler()

            # Formatter
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )

            file_handler.setFormatter(formatter)
            console_handler.setFormatter(formatter)

            logger.addHandler(file_handler)
            logger.addHandler(console_handler)

        return logger

@lru_cache()
def get_auth_logger():
    """Get cached auth logger instance"""
    return LoggerConfig.setup_logger('auth_logger', 'auth_events.log')

@lru_cache()
def get_app_logger():
    """Get cached application logger instance"""
    return LoggerConfig.setup_logger('app_logger', 'app_events.log')

@lru_cache()
def get_videos_logger():
    """Get cached application logger instance"""
    return LoggerConfig.setup_logger('videos_logger', 'videos_events.log')

@lru_cache()
def get_websockets_logger():
    """Get cached websocket logger instance"""
    return LoggerConfig.setup_logger('websockets_logger', 'websockets_events.log')

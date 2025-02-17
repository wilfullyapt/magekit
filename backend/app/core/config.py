
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # Database settings
    SQLITE_DATABASE_URL: str = "sqlite:///./app.db"
    DB_CONNECT_ARGS: dict = {"check_same_thread": False}
    CLEANUP_DAYS: int = 20
    TIMEZONE: str = "UTC"

    # Auth settings
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Protected Routes for app.middleware.auth.py
    PROTECTED_ROUTES: List[str] = ["/extract", "/videos"]

    # API settings
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # Application settings
    SIGNUP_SECRET_PASSWORD: str
    ADMIN: str

    # Extraction settings
    MAX_CLIP_DURATION_SECONDS: int = 600  # 10 minutes

    SPOTIFY_COOKIES_FILE: Path = Path(__file__).parent.parent.parent / "spotify_cookies.txt"

    model_config = SettingsConfigDict(
        env_file=('.env'),
#       env_file=('.env', '.env.prod'),
        env_file_encoding='utf-8',
        extra='ignore'
    )

@lru_cache()
def get_settings() -> Settings:
    """
    Creates and caches a Settings instance.
    Use this function to get settings throughout the application.
    """
    return Settings()

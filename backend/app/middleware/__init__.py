from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from .auth import authenticate
from .logging import log_and_handle_errors

def setup_middleware(app: FastAPI):
    """Configure all middleware for the application"""

    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.middleware("http")(authenticate)
    app.middleware("http")(log_and_handle_errors)

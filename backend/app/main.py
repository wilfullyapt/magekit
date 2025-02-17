from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import auth, protected
from app.middleware import setup_middleware
from app.core.config import get_settings
from app.db.base import init_db

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):

    # Startup
    init_db()

    yield

    # Cleanup
    if hasattr(app.state, 'redis'):
        await app.state.redis.close()

app = FastAPI(lifespan=lifespan)
setup_middleware(app)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(protected.router, prefix="/api", tags=["access"])

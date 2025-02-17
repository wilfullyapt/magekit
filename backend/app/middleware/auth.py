from fastapi import Request
from fastapi.responses import JSONResponse
from ..core.logger import get_auth_logger
from ..core.config import get_settings

settings = get_settings()
auth_logger = get_auth_logger()

# Define protected routes at module level
PROTECTED_ROUTES = settings.PROTECTED_ROUTES

async def authenticate(request: Request, call_next):
    """Authentication middleware for protected routes"""
    if request.method == "OPTIONS":
        return await call_next(request)

    if not any(request.url.path.endswith(route) for route in PROTECTED_ROUTES):
        return await call_next(request)

    try:
        auth_token = request.cookies.get("auth_token")
        if not auth_token:
            auth_logger.warning(f"Missing auth token for {request.url.path}")
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing authentication token"}
            )

        return await call_next(request)

    except Exception as e:
        auth_logger.error(f"Authentication error: {str(e)}")
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid authentication"}
        )

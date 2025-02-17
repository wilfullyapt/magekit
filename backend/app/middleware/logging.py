from fastapi import Request
from fastapi.responses import JSONResponse
import json
import time
from ..core.logger import get_app_logger

app_logger = get_app_logger()

async def log_request(request: Request):
    """Log request details"""
    request_info = {
        "method": request.method,
        "path": request.url.path,
        "headers": dict(request.headers)
    }

    if request.method == 'POST':
        try:
            body = await request.body()
            if body:
                body_str = body.decode()
                request_info["body"] = json.loads(body_str)
                # Recreate body stream for downstream handlers
                async def receive():
                    return {"type": "http.request", "body": body}
                request._receive = receive
        except json.JSONDecodeError:
            request_info["body"] = "Invalid JSON"

#   app_logger.info(f"Request: {json.dumps(request_info, indent=2)}")

async def log_and_handle_errors(request: Request, call_next):
    """Log requests and handle errors"""
    start_time = time.time()

    try:
        await log_request(request)
        response = await call_next(request)

        # Log response time
        process_time = time.time() - start_time
        app_logger.info(f"Request completed in {process_time:.2f}s")

        return response

    except Exception as e:
        app_logger.error(f"Request failed: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )

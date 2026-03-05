from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import traceback

from auth_routes import router as auth_router
from progress_routes import router as progress_router
from session_routes import router as session_router
from teacher_routes import router as teacher_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sapiocode.auth")

app = FastAPI(
    title="SapioCode Auth & Progress API",
    description="Authentication, Progress tracking, and Teacher management for SapioCode",
    version="2.0.0",
)

class CORSErrorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            response = JSONResponse(content={})
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
            return response
        
        try:
            response = await call_next(request)
        except Exception as e:
            print(f"ERROR: {e}")
            traceback.print_exc()
            response = JSONResponse(
                status_code=500,
                content={"detail": str(e), "type": type(e).__name__}
            )
        
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

app.add_middleware(CORSErrorMiddleware)

app.include_router(auth_router)
app.include_router(progress_router)
app.include_router(session_router)
app.include_router(teacher_router)


@app.get("/")
def health_check():
    return {
        "service": "SapioCode Auth & Progress API",
        "status": "running",
        "version": "2.0.0",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# ── Global exception handler ────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )

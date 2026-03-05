"""
CogniCode Intelligence Engine — FastAPI entrypoint (v2.4.0).

Endpoints:
  POST /agent/chat               Unified agentic orchestration  (primary)
  POST /analyze                  Raw AST analysis
  POST /problems/generate-tests  Teacher test-case generation
  GET  /health                   Health check

Production features:
  • Global exception handler (SecurityException → 422, LLM timeout → 503)
  • Structured logging with request_id + processing_time
  • CORS middleware for frontend integration
"""
import time
import uuid
import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.services.groq_client import get_groq_client
from app.services.ast_parser import SecurityException
from app.core.config import get_settings


# ═══════════════════════════════════════════════════════════════
#  STRUCTURED LOGGING
# ═══════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("sapiocode.api")


# ═══════════════════════════════════════════════════════════════
#  LIFESPAN
# ═══════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    settings = get_settings()
    get_groq_client()
    logger.info(
        "Engine started | primary=%s | fallback=%s | port=%s",
        settings.GROQ_PRIMARY_MODEL,
        settings.GROQ_FALLBACK_MODEL,
        settings.PORT,
    )
    yield
    client = get_groq_client()
    await client.close()
    logger.info("Engine shut down cleanly.")


# ═══════════════════════════════════════════════════════════════
#  APP
# ═══════════════════════════════════════════════════════════════

app = FastAPI(
    title="CogniCode Intelligence Engine",
    description=(
        "The AI brain of CogniCode. "
        "Stateful Socratic dialogue grounded in real-time AST analysis. "
        "Accepts code + compiler output + editor context + failed test cases → "
        "returns Socratic guidance, never code solutions. "
        "Built with FastAPI + LangGraph (MemorySaver) + Groq (Kimi K2 / Llama 3.3)."
    ),
    version="2.4.0",
    lifespan=lifespan,
)

# CORS — allow teammates' frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════
#  GLOBAL EXCEPTION HANDLERS
# ═══════════════════════════════════════════════════════════════

@app.exception_handler(SecurityException)
async def security_exception_handler(request: Request, exc: SecurityException):
    """Blocked imports → 422 Unprocessable Entity."""
    logger.warning("Security violation: %s", exc.violations)
    return JSONResponse(
        status_code=422,
        content={
            "error": "security_violation",
            "detail": str(exc),
            "blocked_imports": exc.violations,
        },
    )


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    """LLM exhaustion / timeout → 503 Service Unavailable."""
    logger.error("Runtime error: %s", exc)
    return JSONResponse(
        status_code=503,
        content={
            "error": "service_unavailable",
            "detail": "The AI service is temporarily overloaded. Please retry in a few seconds.",
        },
    )


@app.exception_handler(Exception)
async def catch_all_handler(request: Request, exc: Exception):
    """Catch-all → 500 with clean message (no stack traces)."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "detail": "An unexpected error occurred. Our team has been notified.",
        },
    )


# ═══════════════════════════════════════════════════════════════
#  REQUEST MIDDLEWARE (request_id + processing_time)
# ═══════════════════════════════════════════════════════════════

@app.middleware("http")
async def add_request_context(request: Request, call_next):
    """Inject request_id, log request, track processing_time."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    start = time.perf_counter()

    # Store request_id on state for route handlers
    request.state.request_id = request_id

    response = await call_next(request)

    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Processing-Time-Ms"] = f"{elapsed_ms:.1f}"

    logger.info(
        "req=%s | %s %s | %d | %.1fms",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


# Mount routes
app.include_router(router, prefix="/api")


@app.get("/health")
async def health():
    s = get_settings()
    client = get_groq_client()
    return {
        "service": "cognicode-intelligence",
        "version": "2.4.0",
        "primary_model": s.GROQ_PRIMARY_MODEL,
        "fallback_model": s.GROQ_FALLBACK_MODEL,
        "active_model": client.active_model,
        "status": "ok",
        "endpoints": [
            "POST /api/agent/chat  (mode: hint | chat | viva_start | viva_answer)",
            "POST /api/analyze",
            "POST /api/problems/generate-tests",
            "GET  /health",
        ],
    }

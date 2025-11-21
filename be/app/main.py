"""Main application entry point."""

from __future__ import annotations

import os
import time
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import Request

from app.api.routes import router as api_router
from app.db.beanie import lifespan_context
from constants import APP_NAME

# Configure application-wide logging before the FastAPI app is instantiated.
default_log_level = os.getenv("APP_LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=default_log_level,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

APP_DESCRIPTION = (
    "Backend APIs powering SystemQ, covering authentication, project management, "
    "employee administration, document workflows, and health monitoring services."
)

TAGS_METADATA = [
    {
        "name": "Health",
        "description": "Endpoints that expose service availability and diagnostic information.",
    },
    {
        "name": "Authentication",
        "description": "Login, password recovery, and credential management workflows.",
    },
    {
        "name": "Projects",
        "description": "CRUD operations for project catalogue entries consumed by the frontend.",
    },
    {
        "name": "Employees",
        "description": "Employee roster management including onboarding, search, and deactivation.",
    },
    {
        "name": "Documents",
        "description": (
            "Document storage, navigation helpers, distinct metadata, and history tracking."
        ),
    },
    {
        "name": "Uploads",
        "description": "File and image upload endpoints for document content."
    },
]

app = FastAPI(
    title=APP_NAME,
    description=APP_DESCRIPTION,
    version="0.1.0",
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan_context,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods="*",  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)
app.include_router(api_router)


@app.middleware("http")
async def add_request_logging(request: Request, call_next):
    logger = logging.getLogger("app.request")
    start = time.perf_counter()
    correlation_id = request.headers.get("X-Request-ID") or request.state.__dict__.get("request_id")
    logger.debug(
        "incoming request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "query": str(request.url.query) if request.url.query else "",
            "client": request.client.host if request.client else None,
            "correlation_id": correlation_id,
        },
    )
    try:
        response = await call_next(request)
    except Exception as exc:  # pragma: no cover - logging branch
        duration = time.perf_counter() - start
        logger.exception(
            "request failed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "duration_ms": round(duration * 1000, 2),
                "correlation_id": correlation_id,
            },
        )
        raise exc

    duration = time.perf_counter() - start
    logger.info(
        "request completed",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "correlation_id": correlation_id,
        },
    )
    return response

# Mount static files directory for uploads
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except RuntimeError:
    # Directory might not exist yet, create it
    import os
    os.makedirs("static", exist_ok=True)
    app.mount("/static", StaticFiles(directory="static"), name="static")

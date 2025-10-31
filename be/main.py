"""Main application entry point for Hexagonal Architecture."""

from __future__ import annotations

import os
import time
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import Request

from constants import APP_NAME, MONGODB_URI, MONGODB_DATABASE
from infrastructure.dependency_container import init_container
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from infrastructure.database.user_document import UserDocument
from contextlib import asynccontextmanager

# Configure application-wide logging before the FastAPI app is instantiated.
default_log_level = os.getenv("APP_LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=default_log_level,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

APP_DESCRIPTION = (
    "SystemQ Backend APIs powered by Hexagonal Architecture + DDD + CQRS + Direct State Storage. "
    "Supporting authentication, project management, employee administration, "
    "document workflows, and health monitoring services."
)

# Database client
client = AsyncIOMotorClient(MONGODB_URI)
database = client[MONGODB_DATABASE]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    await init_beanie(database=database, document_models=[UserDocument])
    print("Database initialized with Beanie ODM")

    yield

    # Shutdown
    client.close()
    print("Database connection closed")

# Global container reference (lazy initialized)
_container = None

def get_container():
    """Get dependency container (lazy initialization)."""
    global _container
    if _container is None:
        _container = init_container()
    return _container

app = FastAPI(
    title=APP_NAME,
    description=APP_DESCRIPTION,
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=[
        {
            "name": "Health",
            "description": "Endpoints that expose service availability and diagnostic information.",
        },
        {
            "name": "Users",
            "description": "User management operations using CQRS and Direct State Storage.",
        },
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


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


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "architecture": "Hexagonal + DDD + CQRS"}


# Mount static files directory for uploads
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except RuntimeError:
    # Directory might not exist yet, create it
    import os
    os.makedirs("static", exist_ok=True)
    app.mount("/static", StaticFiles(directory="static"), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

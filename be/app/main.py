"""Main application entry point."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.db.beanie import lifespan_context
from constants import APP_NAME

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
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)
app.include_router(api_router)

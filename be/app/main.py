from __future__ import annotations

from fastapi import FastAPI

from app.api.routes import router as api_router
from app.db.beanie import lifespan_context
from constants import APP_NAME

app = FastAPI(title=APP_NAME, lifespan=lifespan_context)
app.include_router(api_router)

"""User filesystem workspaces — metadata in MongoDB, content on disk."""

from fastapi import APIRouter

from .routes import router as _workspaces_router
from .skills_routes import router as _skills_router

router = APIRouter()
router.include_router(_workspaces_router)
router.include_router(_skills_router)

__all__ = ["router"]

"""Dynamic Dashboard submodule — version-controlled per-user dashboard assets."""

from .routes import router as _assets_router
from .chat_routes import router as _chat_router
from fastapi import APIRouter

# Combine both routers under a single importable `router`
router = APIRouter()
router.include_router(_assets_router)
router.include_router(_chat_router)

__all__ = ["router"]

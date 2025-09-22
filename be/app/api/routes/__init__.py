from fastapi import APIRouter

from app.api.routes.root import router as root_router

router = APIRouter()
router.include_router(root_router)

__all__ = ["router"]

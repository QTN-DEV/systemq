from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.employees import router as employee_router
from app.api.routes.projects import router as project_router
from app.api.routes.root import router as root_router

router = APIRouter()
router.include_router(root_router)
router.include_router(auth_router)
router.include_router(project_router)
router.include_router(employee_router)

__all__ = ["router"]

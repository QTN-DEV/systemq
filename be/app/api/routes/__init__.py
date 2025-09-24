"""App API routes package."""

from fastapi import APIRouter

from .auth import router as auth_router
from .documents import router as documents_router
from .employees import router as employees_router
from .projects import router as projects_router
from .root import router as root_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(documents_router)
router.include_router(employees_router)
router.include_router(projects_router)
router.include_router(root_router)
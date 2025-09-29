"""App API routes package."""

from fastapi import APIRouter

from .auth import router as auth_router
from .documents import router as documents_router
from .document_permissions import router as document_permissions_router
from .employees import router as employees_router
from .projects import router as projects_router
from .root import router as root_router
from .uploads import router as uploads_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(documents_router)
router.include_router(document_permissions_router)
router.include_router(employees_router)
router.include_router(projects_router)
router.include_router(root_router)
router.include_router(uploads_router)
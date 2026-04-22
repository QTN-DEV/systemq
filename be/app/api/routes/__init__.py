"""App API routes package."""

import os

from fastapi import APIRouter

from .auth import router as auth_router
from .background_tasks import router as background_tasks_router
from .document_permissions import router as document_permissions_router
from .documents import router as documents_router
from .employees import router as employees_router
from .project_mappings import router as project_mappings_router
from .projects import router as projects_router
from .root import router as root_router
from .uploads import router as uploads_router
from .workloads import router as workloads_router
from .chat import router as chat_router
from app.submodules.blocks import router as blocks_router
from app.submodules.dashboard import router as dashboard_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(documents_router)
router.include_router(document_permissions_router)
router.include_router(employees_router)
router.include_router(projects_router)
router.include_router(root_router)
router.include_router(uploads_router)
router.include_router(chat_router)
router.include_router(blocks_router)
router.include_router(dashboard_router)

if os.environ.get("APP_ENV") == "production":
    router.include_router(background_tasks_router)
    router.include_router(project_mappings_router)
    router.include_router(workloads_router)

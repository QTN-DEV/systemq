"""Tracker routes — exports tracker_router."""

from fastapi import APIRouter

from .config import router as config_router
from .initiative_projects import router as initiative_projects_router
from .issues import router as issues_router
from .products import router as products_router

tracker_router = APIRouter(prefix="/tracker")
tracker_router.include_router(products_router)
tracker_router.include_router(initiative_projects_router)
tracker_router.include_router(issues_router)
tracker_router.include_router(config_router)

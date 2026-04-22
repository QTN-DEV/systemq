"""FastAPI routes for the dynamic_dashboard submodule.

Endpoints
---------
GET  /dashboard/assets/{user_id}  — fetch user dashboard (auto-creates on first call)
POST /dashboard/assets/{user_id}  — update dashboard content (OCC validated)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.auth import get_current_user
from app.schemas.auth import UserProfile

from .repository import get_dashboard_repo
from .schemas import DashboardResponse, DashboardUpdate
from .service import DashboardConflictError, DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _get_service(repo=Depends(get_dashboard_repo)) -> DashboardService:
    return DashboardService(repo=repo)


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get(
    "/assets/{user_id}",
    response_model=DashboardResponse,
    summary="Fetch user dashboard assets",
)
async def get_dashboard(
    user_id: str,
    svc: DashboardService = Depends(_get_service),
    _: UserProfile = Depends(get_current_user),
) -> DashboardResponse:
    """Return the dashboard document for *user_id*.

    If no document exists yet, one is created automatically with empty
    content and version 1.
    """
    doc = await svc.get_dashboard(user_id)
    return DashboardResponse.model_validate(doc)


@router.post(
    "/assets/{user_id}",
    response_model=DashboardResponse,
    summary="Update user dashboard assets",
    responses={
        status.HTTP_409_CONFLICT: {
            "description": "Version conflict — another editor has modified the document."
        }
    },
)
async def update_dashboard(
    user_id: str,
    payload: DashboardUpdate,
    svc: DashboardService = Depends(_get_service),
    _: UserProfile = Depends(get_current_user),
) -> DashboardResponse:
    """Update the dashboard content for *user_id*.

    The ``target_version`` in the payload must match the document's
    current version (Optimistic Concurrency Control). On mismatch a
    ``409 Conflict`` is returned so the client can re-fetch and retry.
    """
    try:
        doc = await svc.update_dashboard(
            user_id=user_id,
            content=payload.content,
            target_version=payload.target_version,
        )
    except DashboardConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    return DashboardResponse.model_validate(doc)

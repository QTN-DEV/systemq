"""InitiativeProject routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.submodules.tracker.schemas.initiative_project import (
    InitiativeProjectCreate,
    InitiativeProjectResponse,
    InitiativeProjectUpdate,
)
from app.submodules.tracker.services import initiative_project as ip_service
from app.submodules.tracker.services.initiative_project import (
    InitiativeProjectKeyConflictError,
    InitiativeProjectNotFoundError,
)

router = APIRouter(prefix="/initiative-projects", tags=["Tracker"])


@router.get("/", response_model=list[InitiativeProjectResponse])
async def list_initiative_projects(
    initiative_id: str | None = Query(default=None),
) -> list[InitiativeProjectResponse]:
    items = await ip_service.list_initiative_projects(initiative_id=initiative_id)
    return [InitiativeProjectResponse.model_validate(i) for i in items]


@router.post("/", response_model=InitiativeProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_initiative_project(payload: InitiativeProjectCreate) -> InitiativeProjectResponse:
    try:
        ip = await ip_service.create_initiative_project(
            payload.initiative_id,
            payload.key,
            payload.name,
            description=payload.description,
            status=payload.status,
            owner_id=payload.owner_id,
        )
    except InitiativeProjectKeyConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return InitiativeProjectResponse.model_validate(ip)


@router.get("/{ip_id}", response_model=InitiativeProjectResponse)
async def get_initiative_project(ip_id: str) -> InitiativeProjectResponse:
    try:
        ip = await ip_service.get_initiative_project_by_id(ip_id)
    except InitiativeProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return InitiativeProjectResponse.model_validate(ip)


@router.patch("/{ip_id}", response_model=InitiativeProjectResponse)
async def update_initiative_project(ip_id: str, payload: InitiativeProjectUpdate) -> InitiativeProjectResponse:
    try:
        ip = await ip_service.update_initiative_project(ip_id, **payload.model_dump(exclude_unset=True))
    except InitiativeProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InitiativeProjectKeyConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return InitiativeProjectResponse.model_validate(ip)


@router.patch("/{ip_id}/archive", response_model=InitiativeProjectResponse)
async def archive_initiative_project(ip_id: str) -> InitiativeProjectResponse:
    try:
        ip = await ip_service.archive_initiative_project(ip_id)
    except InitiativeProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return InitiativeProjectResponse.model_validate(ip)


@router.patch("/{ip_id}/unarchive", response_model=InitiativeProjectResponse)
async def unarchive_initiative_project(ip_id: str) -> InitiativeProjectResponse:
    try:
        ip = await ip_service.restore_initiative_project(ip_id)
    except InitiativeProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return InitiativeProjectResponse.model_validate(ip)

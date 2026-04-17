"""Initiative routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.submodules.tracker.schemas.initiative import (
    InitiativeCreate,
    InitiativeResponse,
    InitiativeUpdate,
)
from app.submodules.tracker.services import initiative as initiative_service
from app.submodules.tracker.services.initiative import (
    InitiativeKeyConflictError,
    InitiativeNotFoundError,
)

router = APIRouter(prefix="/initiatives", tags=["Tracker"])


@router.get("/", response_model=list[InitiativeResponse])
async def list_initiatives(
    product_id: str | None = Query(default=None),
) -> list[InitiativeResponse]:
    items = await initiative_service.list_initiatives(product_id=product_id)
    return [InitiativeResponse.model_validate(i) for i in items]


@router.post("/", response_model=InitiativeResponse, status_code=status.HTTP_201_CREATED)
async def create_initiative(payload: InitiativeCreate) -> InitiativeResponse:
    try:
        i = await initiative_service.create_initiative(
            payload.product_id,
            payload.key,
            payload.name,
            description=payload.description,
            status=payload.status,
            owner_id=payload.owner_id,
            target_date=payload.target_date,
        )
    except InitiativeKeyConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return InitiativeResponse.model_validate(i)


@router.get("/{initiative_id}", response_model=InitiativeResponse)
async def get_initiative(initiative_id: str) -> InitiativeResponse:
    try:
        i = await initiative_service.get_initiative_by_id(initiative_id)
    except InitiativeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return InitiativeResponse.model_validate(i)


@router.patch("/{initiative_id}", response_model=InitiativeResponse)
async def update_initiative(initiative_id: str, payload: InitiativeUpdate) -> InitiativeResponse:
    try:
        i = await initiative_service.update_initiative(initiative_id, **payload.model_dump(exclude_unset=True))
    except InitiativeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InitiativeKeyConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return InitiativeResponse.model_validate(i)


@router.patch("/{initiative_id}/archive", response_model=InitiativeResponse)
async def archive_initiative(initiative_id: str) -> InitiativeResponse:
    try:
        i = await initiative_service.archive_initiative(initiative_id)
    except InitiativeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return InitiativeResponse.model_validate(i)


@router.patch("/{initiative_id}/unarchive", response_model=InitiativeResponse)
async def unarchive_initiative(initiative_id: str) -> InitiativeResponse:
    try:
        i = await initiative_service.restore_initiative(initiative_id)
    except InitiativeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return InitiativeResponse.model_validate(i)

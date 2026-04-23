"""Markdown skills under ``.claude/skills/`` for a workspace."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from .deps import auth_owner_id, get_owned_workspace
from .schemas import SkillCreate, SkillResponse, SkillUpdate
from .service import WorkspacePathError, WorkspaceService, get_workspace_service

router = APIRouter(prefix="/skills", tags=["Skills"])


def _skill_display_name(name: str) -> str:
    base = name.strip()
    return base[:-3] if base.lower().endswith(".md") else base


@router.post(
    "/",
    response_model=SkillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a skill markdown file",
)
async def create_skill(
    payload: SkillCreate,
    owner_id: str = Depends(auth_owner_id),
    service: WorkspaceService = Depends(get_workspace_service),
) -> SkillResponse:
    await get_owned_workspace(payload.workspace_id, owner_id)
    try:
        service.write_skill(payload.workspace_id, payload.name, payload.content, overwrite=False)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except WorkspacePathError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FileExistsError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return SkillResponse(name=_skill_display_name(payload.name), content=payload.content)


@router.put(
    "/{name}",
    response_model=SkillResponse,
    summary="Update a skill file",
)
async def update_skill(
    name: str,
    payload: SkillUpdate,
    workspace_id: str = Query(...),
    owner_id: str = Depends(auth_owner_id),
    service: WorkspaceService = Depends(get_workspace_service),
) -> SkillResponse:
    await get_owned_workspace(workspace_id, owner_id)
    try:
        service.write_skill(workspace_id, name, payload.content, overwrite=True)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except WorkspacePathError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    content = service.read_skill(workspace_id, name)
    return SkillResponse(name=_skill_display_name(name), content=content)


@router.delete(
    "/{name}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a skill file",
)
async def delete_skill(
    name: str,
    workspace_id: str = Query(...),
    owner_id: str = Depends(auth_owner_id),
    service: WorkspaceService = Depends(get_workspace_service),
) -> None:
    await get_owned_workspace(workspace_id, owner_id)
    try:
        service.delete_skill(workspace_id, name)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except WorkspacePathError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

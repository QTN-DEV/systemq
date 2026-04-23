"""Workspace metadata and filesystem API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from .deps import auth_owner_id, get_owned_workspace
from .models import WorkspaceMetadata
from .schemas import (
    WorkspaceCreate,
    WorkspaceFileCreate,
    WorkspaceFilesResponse,
    WorkspaceFileEntry,
    WorkspaceResponse,
    WorkspaceUploadResponse,
)
from .service import (
    WorkspacePathError,
    WorkspaceService,
    compute_previous,
    get_workspace_service,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


def _to_response(ws: WorkspaceMetadata) -> WorkspaceResponse:
    return WorkspaceResponse(id=str(ws.id), name=ws.name, owner_id=ws.owner_id)


@router.post(
    "/create",
    response_model=WorkspaceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create workspace and disk scaffold",
)
async def create_workspace(
    payload: WorkspaceCreate,
    owner_id: str = Depends(auth_owner_id),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceResponse:
    ws = WorkspaceMetadata(name=payload.name.strip(), owner_id=owner_id)
    await ws.insert()
    try:
        service.create_workspace_scaffold(str(ws.id))
    except Exception:
        await ws.delete()
        raise
    return _to_response(ws)


@router.get(
    "/list",
    response_model=list[WorkspaceResponse],
    summary="List workspaces for an owner",
)
async def list_workspaces(
    owner_id: str = Depends(auth_owner_id),
    owner_id_query: str | None = Query(None, alias="owner_id"),
) -> list[WorkspaceResponse]:
    target = owner_id_query or owner_id
    if target != owner_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Cannot list workspaces for another owner",
        )
    items = await WorkspaceMetadata.find(WorkspaceMetadata.owner_id == target).sort(-WorkspaceMetadata.id).to_list()
    return [_to_response(ws) for ws in items]


@router.get(
    "/files",
    response_model=WorkspaceFilesResponse,
    summary="List files and folders under a path",
)
async def list_workspace_files(
    workspace_id: str = Query(..., description="Workspace document id"),
    in_: str | None = Query(None, alias="in"),
    owner_id: str = Depends(auth_owner_id),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceFilesResponse:
    await get_owned_workspace(workspace_id, owner_id)
    if in_ is None:
        effective = "data"
    else:
        effective = in_.strip().lstrip("/")
    previous = compute_previous(effective)
    try:
        raw = service.list_directory(workspace_id, effective)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except NotADirectoryError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except WorkspacePathError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    entries = [WorkspaceFileEntry.model_validate(item) for item in raw]
    return WorkspaceFilesResponse(previous=previous, result=entries)


@router.post(
    "/files/create",
    response_model=WorkspaceUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a file or folder under data/ by default",
)
async def create_workspace_path(
    payload: WorkspaceFileCreate,
    workspace_id: str = Query(...),
    owner_id: str = Depends(auth_owner_id),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceUploadResponse:
    await get_owned_workspace(workspace_id, owner_id)
    try:
        path = service.create_file_or_folder(
            workspace_id,
            payload.path,
            is_folder=payload.is_folder,
        )
    except WorkspacePathError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FileExistsError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    rel = path.relative_to(service.workspace_root(workspace_id))
    return WorkspaceUploadResponse(path=str(rel).replace("\\", "/"))


@router.post(
    "/upload",
    response_model=WorkspaceUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file (defaults under data/)",
)
async def upload_workspace_file(
    workspace_id: str = Query(...),
    file: UploadFile = File(...),
    path: str | None = Query(None, description="Relative directory or full relative path"),
    owner_id: str = Depends(auth_owner_id),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceUploadResponse:
    await get_owned_workspace(workspace_id, owner_id)
    try:
        dest = await service.save_upload(workspace_id, file, path)
    except WorkspacePathError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except IsADirectoryError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    rel = dest.relative_to(service.workspace_root(workspace_id))
    return WorkspaceUploadResponse(path=str(rel).replace("\\", "/"))


@router.delete(
    "/{workspace_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete workspace metadata and remove files from disk",
)
async def delete_workspace(
    workspace_id: str,
    owner_id: str = Depends(auth_owner_id),
    service: WorkspaceService = Depends(get_workspace_service),
) -> None:
    ws = await get_owned_workspace(workspace_id, owner_id)
    wid = str(ws.id)
    try:
        service.delete_workspace_tree(wid)
    except OSError as exc:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove workspace files: {exc}",
        ) from exc
    await ws.delete()

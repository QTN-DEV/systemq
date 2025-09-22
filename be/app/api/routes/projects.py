from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas.project import Project, ProjectCreate, ProjectUpdate
from app.services import project as project_service
from app.services.project import ProjectAlreadyExistsError, ProjectNotFoundError

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("/", response_model=list[Project])
async def list_projects() -> list[Project]:
    projects = await project_service.list_projects()
    return [Project.model_validate(project) for project in projects]


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    try:
        project = await project_service.get_project_by_id(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Project.model_validate(project)


@router.post("/", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate) -> Project:
    try:
        project = await project_service.create_project(payload.id, payload.name, payload.avatar)
    except ProjectAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return Project.model_validate(project)


@router.patch("/{project_id}", response_model=Project)
async def update_project(project_id: str, payload: ProjectUpdate) -> Project:
    if payload.name is None and payload.avatar is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update",
        )
    try:
        project = await project_service.update_project(
            project_id,
            name=payload.name,
            avatar=payload.avatar,
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Project.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str) -> None:
    try:
        await project_service.delete_project(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

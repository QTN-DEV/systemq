"""Project routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, status

from app.schemas.project import Project, ProjectCreate, ProjectUpdate
from app.services import project as project_service
from app.services.project import ProjectAlreadyExistsError, ProjectNotFoundError

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get(
    "/",
    response_model=list[Project],
    summary="List projects",
    response_description="Collection of all registered projects.",
)
async def list_projects() -> list[Project]:
    """Return every project currently stored in the catalogue."""
    projects = await project_service.list_projects()
    return [Project.model_validate(project) for project in projects]


@router.get(
    "/{project_id}",
    response_model=Project,
    summary="Retrieve a project",
    response_description="Full details for the requested project.",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "Project with the supplied identifier does not exist.",
        },
    },
)
async def get_project(project_id: str) -> Project:
    """Fetch an individual project by its identifier."""
    try:
        project = await project_service.get_project_by_id(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Project.model_validate(project)


@router.post(
    "/",
    response_model=Project,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
    response_description="Details for the newly created project entry.",
    responses={
        status.HTTP_409_CONFLICT: {
            "description": "A project with that identifier already exists.",
        },
    },
)
async def create_project(payload: ProjectCreate) -> Project:
    """Persist a new project derived from the provided payload."""
    try:
        project = await project_service.create_project(payload.id, payload.name, payload.avatar)
    except ProjectAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return Project.model_validate(project)


@router.patch(
    "/{project_id}",
    response_model=Project,
    summary="Update project metadata",
    response_description="Updated project details after the patch operation.",
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "description": "No fields provided in the request body.",
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Project with the supplied identifier does not exist.",
        },
    },
)
async def update_project(project_id: str, payload: ProjectUpdate) -> Project:
    """Modify project attributes such as the display name or avatar."""
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


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "Project with the supplied identifier does not exist.",
        },
    },
)
async def delete_project(project_id: str) -> None:
    """Remove the specified project from the catalogue."""
    try:
        await project_service.delete_project(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

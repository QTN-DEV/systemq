from __future__ import annotations

from typing import Iterable

from app.models.project import Project


class ProjectAlreadyExistsError(ValueError):
    pass


class ProjectNotFoundError(ValueError):
    pass


def _serialize(project: Project) -> dict[str, str | None]:
    return {
        "id": project.project_id,
        "name": project.name,
        "avatar": project.avatar,
    }


async def list_projects() -> list[dict[str, str | None]]:
    projects = await Project.find_all().to_list()
    return [_serialize(project) for project in projects]


async def get_project_by_id(project_id: str) -> dict[str, str | None]:
    project = await Project.find_one(Project.project_id == project_id)
    if project is None:
        raise ProjectNotFoundError(f"Project '{project_id}' not found")
    return _serialize(project)


async def create_project(project_id: str, name: str, avatar: str | None) -> dict[str, str | None]:
    existing = await Project.find_one(Project.project_id == project_id)
    if existing is not None:
        raise ProjectAlreadyExistsError(f"Project '{project_id}' already exists")

    project = Project(project_id=project_id, name=name, avatar=avatar)
    await project.insert()
    return _serialize(project)


async def update_project(
    project_id: str,
    *,
    name: str | None = None,
    avatar: str | None = None,
) -> dict[str, str | None]:
    project = await Project.find_one(Project.project_id == project_id)
    if project is None:
        raise ProjectNotFoundError(f"Project '{project_id}' not found")

    if name is not None:
        project.name = name
    if avatar is not None:
        project.avatar = avatar
    await project.touch()
    return _serialize(project)


async def delete_project(project_id: str) -> None:
    project = await Project.find_one(Project.project_id == project_id)
    if project is None:
        raise ProjectNotFoundError(f"Project '{project_id}' not found")
    await project.delete()


async def bulk_upsert(projects: Iterable[dict[str, str | None]]) -> None:
    for project in projects:
        project_id = project["id"]
        name = project.get("name")
        avatar = project.get("avatar")
        if not project_id or not name:
            continue
        existing = await Project.find_one(Project.project_id == project_id)
        if existing:
            has_changes = False
            if existing.name != name:
                existing.name = name
                has_changes = True
            if existing.avatar != avatar:
                existing.avatar = avatar
                has_changes = True
            if has_changes:
                await existing.touch()
        else:
            new_project = Project(project_id=project_id, name=name, avatar=avatar)
            await new_project.insert()

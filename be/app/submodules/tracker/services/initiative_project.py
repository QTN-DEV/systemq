"""InitiativeProject service."""

from __future__ import annotations

from beanie import PydanticObjectId

from app.submodules.tracker.models.initiative_project import InitiativeProject


class InitiativeProjectNotFoundError(ValueError):
    pass


class InitiativeProjectKeyConflictError(ValueError):
    pass


def _serialize(ip: InitiativeProject) -> dict:
    return {
        "id": str(ip.id),
        "initiative_id": str(ip.initiative_id),
        "key": ip.key,
        "name": ip.name,
        "description": ip.description,
        "status": ip.status,
        "owner_id": str(ip.owner_id) if ip.owner_id else None,
        "created_at": ip.created_at,
        "updated_at": ip.updated_at,
        "archived_at": ip.archived_at,
    }


async def list_initiative_projects(initiative_id: str | None = None) -> list[dict]:
    query = InitiativeProject.find()
    if initiative_id:
        query = InitiativeProject.find(
            InitiativeProject.initiative_id == PydanticObjectId(initiative_id)
        )
    items = await query.to_list()
    return [_serialize(ip) for ip in items]


async def get_initiative_project_by_id(ip_id: str) -> dict:
    ip = await InitiativeProject.get(PydanticObjectId(ip_id))
    if ip is None:
        raise InitiativeProjectNotFoundError(f"InitiativeProject '{ip_id}' not found")
    return _serialize(ip)


async def create_initiative_project(
    initiative_id: str,
    key: str,
    name: str,
    *,
    description: str | None = None,
    status: str = "planned",
    owner_id: str | None = None,
) -> dict:
    existing = await InitiativeProject.find_one(InitiativeProject.key == key)
    if existing is not None:
        raise InitiativeProjectKeyConflictError(f"InitiativeProject key '{key}' already exists")

    ip = InitiativeProject(
        initiative_id=PydanticObjectId(initiative_id),
        key=key,
        name=name,
        description=description,
        status=status,
        owner_id=PydanticObjectId(owner_id) if owner_id else None,
    )
    await ip.insert()
    return _serialize(ip)


async def update_initiative_project(ip_id: str, **kwargs) -> dict:
    ip = await InitiativeProject.get(PydanticObjectId(ip_id))
    if ip is None:
        raise InitiativeProjectNotFoundError(f"InitiativeProject '{ip_id}' not found")

    if "key" in kwargs and kwargs["key"] is not None:
        conflict = await InitiativeProject.find_one(InitiativeProject.key == kwargs["key"])
        if conflict and str(conflict.id) != ip_id:
            raise InitiativeProjectKeyConflictError(f"InitiativeProject key '{kwargs['key']}' already exists")
        ip.key = kwargs["key"]
    if "name" in kwargs and kwargs["name"] is not None:
        ip.name = kwargs["name"]
    if "description" in kwargs:
        ip.description = kwargs["description"]
    if "status" in kwargs and kwargs["status"] is not None:
        ip.status = kwargs["status"]
    if "owner_id" in kwargs:
        ip.owner_id = PydanticObjectId(kwargs["owner_id"]) if kwargs["owner_id"] else None
    if "archived_at" in kwargs:
        ip.archived_at = kwargs["archived_at"]

    await ip.touch()
    return _serialize(ip)

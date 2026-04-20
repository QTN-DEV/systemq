"""InitiativeProject service."""

from __future__ import annotations

from beanie import PydanticObjectId

from app.submodules.tracker.models.initiative_project import InitiativeProject
from app.submodules.tracker.services.config import get_allowed_statuses


class InitiativeProjectNotFoundError(ValueError):
    pass


class InvalidStatusError(ValueError):
    pass


async def _validate_planning_status(status: str) -> None:
    allowed = await get_allowed_statuses("planning_status")
    if status not in allowed:
        raise InvalidStatusError(f"Invalid status '{status}'. Allowed: {allowed}")


class InitiativeProjectKeyConflictError(ValueError):
    pass


def _serialize(ip: InitiativeProject) -> dict:
    return {
        "id": str(ip.id),
        "product_id": str(ip.product_id),
        "key": ip.key,
        "name": ip.name,
        "description": ip.description,
        "status": ip.status,
        "owner_id": str(ip.owner_id) if ip.owner_id else None,
        "created_at": ip.created_at,
        "updated_at": ip.updated_at,
        "deleted_at": ip.deleted_at,
    }


async def list_initiative_projects(product_id: str | None = None) -> list[dict]:
    if product_id:
        items = await InitiativeProject.find(
            InitiativeProject.product_id == PydanticObjectId(product_id)
        ).to_list()
    else:
        items = await InitiativeProject.find_all().to_list()
    return [_serialize(ip) for ip in items]


async def get_initiative_project_by_id(ip_id: str) -> dict:
    ip = await InitiativeProject.get(PydanticObjectId(ip_id))
    if ip is None:
        raise InitiativeProjectNotFoundError(f"InitiativeProject '{ip_id}' not found")
    return _serialize(ip)


async def create_initiative_project(
    product_id: str,
    key: str,
    name: str,
    *,
    description: str | None = None,
    status: str = "planned",
    owner_id: str | None = None,
) -> dict:
    await _validate_planning_status(status)
    existing = await InitiativeProject.find_one(InitiativeProject.key == key)
    if existing is not None:
        raise InitiativeProjectKeyConflictError(f"InitiativeProject key '{key}' already exists")

    ip = InitiativeProject(
        product_id=PydanticObjectId(product_id),
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
        await _validate_planning_status(kwargs["status"])
        ip.status = kwargs["status"]
    if "owner_id" in kwargs:
        ip.owner_id = PydanticObjectId(kwargs["owner_id"]) if kwargs["owner_id"] else None

    await ip.touch()
    return _serialize(ip)


async def archive_initiative_project(ip_id: str) -> dict:
    ip = await InitiativeProject.get(PydanticObjectId(ip_id))
    if ip is None:
        raise InitiativeProjectNotFoundError(f"InitiativeProject '{ip_id}' not found")
    await ip.delete()
    return _serialize(ip)


async def restore_initiative_project(ip_id: str) -> dict:
    results = await InitiativeProject.find_many_in_all(
        InitiativeProject.id == PydanticObjectId(ip_id)
    ).to_list()
    if not results:
        raise InitiativeProjectNotFoundError(f"InitiativeProject '{ip_id}' not found")
    ip = results[0]
    ip.deleted_at = None
    await ip.save()
    return _serialize(ip)

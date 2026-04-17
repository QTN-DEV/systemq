"""Initiative service."""

from __future__ import annotations

from datetime import date

from beanie import PydanticObjectId

from app.submodules.tracker.models.initiative import TrackerInitiative
from app.submodules.tracker.services.config import get_allowed_statuses


class InitiativeNotFoundError(ValueError):
    pass


class InvalidStatusError(ValueError):
    pass


async def _validate_planning_status(status: str) -> None:
    allowed = await get_allowed_statuses("planning_status")
    if status not in allowed:
        raise InvalidStatusError(f"Invalid status '{status}'. Allowed: {allowed}")


class InitiativeKeyConflictError(ValueError):
    pass


def _serialize(i: TrackerInitiative) -> dict:
    return {
        "id": str(i.id),
        "product_id": str(i.product_id),
        "key": i.key,
        "name": i.name,
        "description": i.description,
        "status": i.status,
        "owner_id": str(i.owner_id) if i.owner_id else None,
        "target_date": i.target_date.isoformat() if i.target_date else None,
        "created_at": i.created_at,
        "updated_at": i.updated_at,
        "deleted_at": i.deleted_at,
    }


async def list_initiatives(product_id: str | None = None) -> list[dict]:
    if product_id:
        initiatives = await TrackerInitiative.find(
            TrackerInitiative.product_id == PydanticObjectId(product_id)
        ).to_list()
    else:
        initiatives = await TrackerInitiative.find_all().to_list()
    return [_serialize(i) for i in initiatives]


async def get_initiative_by_id(initiative_id: str) -> dict:
    i = await TrackerInitiative.get(PydanticObjectId(initiative_id))
    if i is None:
        raise InitiativeNotFoundError(f"Initiative '{initiative_id}' not found")
    return _serialize(i)


async def create_initiative(
    product_id: str,
    key: str,
    name: str,
    *,
    description: str | None = None,
    status: str = "planned",
    owner_id: str | None = None,
    target_date: date | None = None,
) -> dict:
    await _validate_planning_status(status)
    existing = await TrackerInitiative.find_one(TrackerInitiative.key == key)
    if existing is not None:
        raise InitiativeKeyConflictError(f"Initiative key '{key}' already exists")

    i = TrackerInitiative(
        product_id=PydanticObjectId(product_id),
        key=key,
        name=name,
        description=description,
        status=status,
        owner_id=PydanticObjectId(owner_id) if owner_id else None,
        target_date=target_date,
    )
    await i.insert()
    return _serialize(i)


async def update_initiative(initiative_id: str, **kwargs) -> dict:
    i = await TrackerInitiative.get(PydanticObjectId(initiative_id))
    if i is None:
        raise InitiativeNotFoundError(f"Initiative '{initiative_id}' not found")

    if "status" in kwargs and kwargs["status"] is not None:
        await _validate_planning_status(kwargs["status"])
    if "key" in kwargs and kwargs["key"] is not None:
        conflict = await TrackerInitiative.find_one(TrackerInitiative.key == kwargs["key"])
        if conflict and str(conflict.id) != initiative_id:
            raise InitiativeKeyConflictError(f"Initiative key '{kwargs['key']}' already exists")
        i.key = kwargs["key"]
    if "name" in kwargs and kwargs["name"] is not None:
        i.name = kwargs["name"]
    if "description" in kwargs:
        i.description = kwargs["description"]
    if "status" in kwargs and kwargs["status"] is not None:
        i.status = kwargs["status"]
    if "owner_id" in kwargs:
        i.owner_id = PydanticObjectId(kwargs["owner_id"]) if kwargs["owner_id"] else None
    if "target_date" in kwargs:
        i.target_date = kwargs["target_date"]

    await i.touch()
    return _serialize(i)


async def archive_initiative(initiative_id: str) -> dict:
    i = await TrackerInitiative.get(PydanticObjectId(initiative_id))
    if i is None:
        raise InitiativeNotFoundError(f"Initiative '{initiative_id}' not found")
    await i.delete()
    return _serialize(i)


async def restore_initiative(initiative_id: str) -> dict:
    results = await TrackerInitiative.find_many_in_all(
        TrackerInitiative.id == PydanticObjectId(initiative_id)
    ).to_list()
    if not results:
        raise InitiativeNotFoundError(f"Initiative '{initiative_id}' not found")
    i = results[0]
    i.deleted_at = None
    await i.save()
    return _serialize(i)

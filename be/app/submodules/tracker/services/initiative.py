"""Initiative service."""

from __future__ import annotations

from datetime import date

from beanie import PydanticObjectId

from app.submodules.tracker.models.initiative import TrackerInitiative


class InitiativeNotFoundError(ValueError):
    pass


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
        "archived_at": i.archived_at,
    }


async def list_initiatives(product_id: str | None = None) -> list[dict]:
    query = TrackerInitiative.find()
    if product_id:
        query = TrackerInitiative.find(TrackerInitiative.product_id == PydanticObjectId(product_id))
    initiatives = await query.to_list()
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
    if "archived_at" in kwargs:
        i.archived_at = kwargs["archived_at"]

    await i.touch()
    return _serialize(i)

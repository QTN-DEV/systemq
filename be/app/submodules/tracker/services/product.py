"""Product service."""

from __future__ import annotations

from datetime import date

from beanie import PydanticObjectId

from app.submodules.tracker.models.product import TrackerProduct


class ProductNotFoundError(ValueError):
    pass


class ProductKeyConflictError(ValueError):
    pass


def _serialize(p: TrackerProduct) -> dict:
    return {
        "id": str(p.id),
        "key": p.key,
        "name": p.name,
        "description": p.description,
        "status": p.status,
        "owner_id": str(p.owner_id) if p.owner_id else None,
        "target_date": p.target_date.isoformat() if p.target_date else None,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "archived_at": p.archived_at,
    }


async def list_products() -> list[dict]:
    products = await TrackerProduct.find_all().to_list()
    return [_serialize(p) for p in products]


async def get_product_by_id(product_id: str) -> dict:
    p = await TrackerProduct.get(PydanticObjectId(product_id))
    if p is None:
        raise ProductNotFoundError(f"Product '{product_id}' not found")
    return _serialize(p)


async def create_product(
    key: str,
    name: str,
    *,
    description: str | None = None,
    status: str = "planned",
    owner_id: str | None = None,
    target_date: date | None = None,
) -> dict:
    existing = await TrackerProduct.find_one(TrackerProduct.key == key)
    if existing is not None:
        raise ProductKeyConflictError(f"Product key '{key}' already exists")

    p = TrackerProduct(
        key=key,
        name=name,
        description=description,
        status=status,
        owner_id=PydanticObjectId(owner_id) if owner_id else None,
        target_date=target_date,
    )
    await p.insert()
    return _serialize(p)


async def update_product(product_id: str, **kwargs) -> dict:
    p = await TrackerProduct.get(PydanticObjectId(product_id))
    if p is None:
        raise ProductNotFoundError(f"Product '{product_id}' not found")

    if "key" in kwargs and kwargs["key"] is not None:
        conflict = await TrackerProduct.find_one(TrackerProduct.key == kwargs["key"])
        if conflict and str(conflict.id) != product_id:
            raise ProductKeyConflictError(f"Product key '{kwargs['key']}' already exists")
        p.key = kwargs["key"]
    if "name" in kwargs and kwargs["name"] is not None:
        p.name = kwargs["name"]
    if "description" in kwargs:
        p.description = kwargs["description"]
    if "status" in kwargs and kwargs["status"] is not None:
        p.status = kwargs["status"]
    if "owner_id" in kwargs:
        p.owner_id = PydanticObjectId(kwargs["owner_id"]) if kwargs["owner_id"] else None
    if "target_date" in kwargs:
        p.target_date = kwargs["target_date"]
    if "archived_at" in kwargs:
        p.archived_at = kwargs["archived_at"]

    await p.touch()
    return _serialize(p)

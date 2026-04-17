"""TrackerProduct model."""

from __future__ import annotations

from datetime import UTC, date, datetime

from beanie import Document, PydanticObjectId
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(UTC)


class TrackerProduct(Document):
    key: str
    name: str
    description: str | None = None
    status: str = "planned"
    owner_id: PydanticObjectId | None = None
    target_date: date | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
    archived_at: datetime | None = None

    class Settings:
        name = "tracker_products"
        indexes = ["key", "status", "owner_id"]

    async def touch(self) -> None:
        self.updated_at = _utcnow()
        await self.save()

"""TrackerConfig model."""

from __future__ import annotations

from datetime import UTC, datetime

from beanie import Document
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(UTC)


class TrackerConfig(Document):
    config_type: str
    values: list[str] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "tracker_config"
        indexes = ["config_type"]

    async def touch(self) -> None:
        self.updated_at = _utcnow()
        await self.save()

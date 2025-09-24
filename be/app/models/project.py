"""Project model definitions."""

from __future__ import annotations

from datetime import UTC, datetime

from beanie import Document
from pydantic import ConfigDict, Field, HttpUrl


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Project(Document):
    project_id: str = Field(alias="id")
    name: str
    avatar: HttpUrl | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    model_config = ConfigDict(populate_by_name=True)

    class Settings:
        name = "projects"
        indexes = ["project_id"]

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"Project(project_id={self.project_id!r}, name={self.name!r})"

    async def touch(self) -> None:
        self.updated_at = _utcnow()
        await self.save()

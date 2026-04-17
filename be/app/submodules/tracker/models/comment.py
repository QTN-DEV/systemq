"""IssueComment model."""

from __future__ import annotations

from datetime import UTC, datetime

from beanie import Document, PydanticObjectId
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(UTC)


class IssueComment(Document):
    issue_id: PydanticObjectId
    author_id: PydanticObjectId
    body: str
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
    deleted_at: datetime | None = None

    class Settings:
        name = "tracker_issue_comments"
        indexes = ["issue_id"]

    async def touch(self) -> None:
        self.updated_at = _utcnow()
        await self.save()

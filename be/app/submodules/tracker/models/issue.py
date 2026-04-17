"""TrackerIssue model."""

from __future__ import annotations

from datetime import UTC, datetime

from beanie import Document, PydanticObjectId
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(UTC)


class TrackerIssue(Document):
    initiative_project_id: PydanticObjectId | None = None
    parent_issue_id: PydanticObjectId | None = None
    title: str
    description: str | None = None
    status: str = "triage"
    priority: int = 3
    assignee_id: PydanticObjectId | None = None
    reporter_id: PydanticObjectId | None = None
    triage_owner_id: PydanticObjectId | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
    closed_at: datetime | None = None
    archived_at: datetime | None = None

    class Settings:
        name = "tracker_issues"
        indexes = ["initiative_project_id", "parent_issue_id", "assignee_id", "status", "priority"]

    async def touch(self) -> None:
        self.updated_at = _utcnow()
        await self.save()

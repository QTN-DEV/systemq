"""IssueEvent model."""

from __future__ import annotations

from datetime import UTC, datetime

from beanie import Document, PydanticObjectId
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(UTC)


class IssueEvent(Document):
    issue_id: PydanticObjectId
    actor_id: PydanticObjectId | None = None
    event_type: str
    payload: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "tracker_issue_events"
        indexes = ["issue_id"]

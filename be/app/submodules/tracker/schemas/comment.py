"""Comment and event schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    body: str = Field(min_length=1)
    author_id: str


class CommentResponse(BaseModel):
    id: str
    issue_id: str
    author_id: str
    body: str
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


class IssueEventResponse(BaseModel):
    id: str
    issue_id: str
    actor_id: str | None = None
    event_type: str
    payload: dict[str, Any] = {}
    created_at: datetime

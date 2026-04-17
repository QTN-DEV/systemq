"""Comment schemas."""

from __future__ import annotations

from datetime import datetime

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

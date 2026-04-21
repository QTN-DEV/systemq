"""Beanie document models for the blocks submodule."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from beanie import Document
from pydantic import ConfigDict, Field

from .enums import BlockStatusLiteral


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Block(Document):
    id: UUID = Field(default_factory=uuid4)
    parent_id: UUID | None = None
    title: str
    description: str | None = None
    status: BlockStatusLiteral = "triage"
    start_date: datetime | None = None
    deadline: datetime | None = None
    assignees: list[str] = Field(default_factory=list)
    created_by: str
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    # Not stored in DB — populated by _build_tree for nested responses
    children: list["Block"] = Field(default_factory=list, exclude=True)

    model_config = ConfigDict(populate_by_name=True)

    class Settings:
        name = "blocks"
        indexes = ["parent_id", "status", "created_by"]


class Comment(Document):
    id: UUID = Field(default_factory=uuid4)
    block_id: UUID
    author_id: str
    author_name: str
    content: str
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "block_comments"
        indexes = ["block_id"]


class BlockHistory(Document):
    id: UUID = Field(default_factory=uuid4)
    block_id: UUID
    changed_by_id: str
    changed_by_name: str
    field: str
    old_value: str | None = None
    new_value: str | None = None
    changed_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "block_history"
        indexes = ["block_id", "changed_at"]

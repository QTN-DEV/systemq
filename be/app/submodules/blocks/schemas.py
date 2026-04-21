"""Pydantic request/response schemas for the blocks submodule."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from .enums import BlockStatusLiteral


# ── Request Schemas ────────────────────────────────────────────────────────

class BlockCreate(BaseModel):
    parent_id: UUID | None = None
    title: str = Field(min_length=1)
    description: str | None = None
    status: BlockStatusLiteral = "triage"
    start_date: datetime | None = None
    deadline: datetime | None = None
    assignees: list[str] = Field(default_factory=list)


class BlockUpdate(BaseModel):
    parent_id: UUID | None = None
    title: str | None = Field(default=None, min_length=1)
    description: str | None = None
    status: BlockStatusLiteral | None = None
    start_date: datetime | None = None
    deadline: datetime | None = None
    assignees: list[str] | None = None


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)


# ── Response Schemas ───────────────────────────────────────────────────────

class BlockResponse(BaseModel):
    id: UUID
    parent_id: UUID | None
    title: str
    description: str | None
    status: BlockStatusLiteral
    start_date: datetime | None
    deadline: datetime | None
    assignees: list[str]
    created_by: str
    created_at: datetime
    updated_at: datetime
    children: list[BlockResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


BlockResponse.model_rebuild()


class CommentResponse(BaseModel):
    id: UUID
    block_id: UUID
    author_id: str
    author_name: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BlockHistoryResponse(BaseModel):
    id: UUID
    block_id: UUID
    changed_by_id: str
    changed_by_name: str
    field: str
    old_value: str | None
    new_value: str | None
    changed_at: datetime

    model_config = {"from_attributes": True}

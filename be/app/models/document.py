"""Document model definitions."""

from __future__ import annotations

from datetime import datetime, UTC
from typing import Any, Literal

from beanie import Document
from pydantic import BaseModel, ConfigDict, Field


def _utcnow() -> datetime:
    return datetime.now(UTC)


class DocumentOwner(BaseModel):
    id: str
    name: str
    role: Literal["admin", "manager", "employee", "secretary"]
    avatar: str | None = None


class DocumentItem(Document):
    document_id: str = Field(alias="id")
    name: str
    title: str | None = None
    type: Literal["folder", "file"]
    owned_by: DocumentOwner
    category: str | None = None
    status: Literal["active", "archived", "shared", "private"] = "active"
    date_created: datetime = Field(default_factory=_utcnow)
    last_modified: datetime = Field(default_factory=_utcnow)
    size: str | None = None
    item_count: int | None = None
    parent_id: str | None = None
    path: list[str] = Field(default_factory=list)
    shared: bool = False
    share_url: str | None = None
    content: str | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    model_config = ConfigDict(populate_by_name=True)

    class Settings:
        name = "documents"
        indexes = ["document_id", "parent_id", "category", "type", "is_deleted"]

    async def touch(self) -> None:
        self.updated_at = _utcnow()
        self.last_modified = self.updated_at
        await self.save()


class DocumentHistory(Document):
    document_id: str
    revision: int
    action: Literal["created", "updated", "deleted"]
    changes: dict[str, Any] = Field(default_factory=dict)
    snapshot: dict[str, Any] = Field(default_factory=dict)
    editor_id: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "document_history"
        indexes = ["document_id", "revision"]

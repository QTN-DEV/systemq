"""Document model definitions."""

from __future__ import annotations

from datetime import datetime, UTC
from typing import Any, Literal

from beanie import Document
from pydantic import BaseModel, ConfigDict, Field


class DocumentBlock(BaseModel):
    id: str
    type: Literal["paragraph", "heading1", "heading2", "heading3", "bulleted-list", "numbered-list", "quote", "code", "image", "file"]
    content: str
    alignment: Literal["left", "center", "right"] | None = "left"
    url: str | None = None  # For image src or file download URL
    fileName: str | None = Field(None, alias="fileName")  # For file blocks
    fileSize: str | None = Field(None, alias="fileSize")  # For file blocks


def _utcnow() -> datetime:
    return datetime.now(UTC)


class DocumentOwner(BaseModel):
    id: str
    name: str
    role: Literal["admin", "manager", "employee", "secretary"]
    avatar: str | None = None


class DocumentPermission(BaseModel):
    """Individual user permission for a document."""
    user_id: str
    user_name: str
    user_email: str
    permission: Literal["viewer", "editor"]


class DivisionPermission(BaseModel):
    """Division-level permission for a document."""
    division: str
    permission: Literal["viewer", "editor"]


class DocumentItem(Document):
    document_id: str = Field(alias="id")
    name: str
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
    content: list[DocumentBlock] | None = Field(default_factory=list)
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
    # Permission fields
    user_permissions: list[DocumentPermission] = Field(default_factory=list)
    division_permissions: list[DivisionPermission] = Field(default_factory=list)

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

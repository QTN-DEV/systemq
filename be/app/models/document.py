"""Document model definitions."""

from __future__ import annotations

from datetime import datetime, UTC
from typing import Any, Literal

from beanie import Document
from pydantic import BaseModel, ConfigDict, Field, model_validator


class TableCell(BaseModel):
    id: str
    content: str | None = ""

    model_config = ConfigDict(extra="allow")


class TableRow(BaseModel):
    id: str
    cells: list[TableCell] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class TableData(BaseModel):
    rows: list[TableRow] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class DocumentBlock(BaseModel):
    id: str
    type: Literal[
        "paragraph",
        "heading1",
        "heading2",
        "heading3",
        "bulleted-list",
        "numbered-list",
        "quote",
        "code",
        "image",
        "file",
        "table",
    ]
    content: str | None = ""
    alignment: Literal["left", "center", "right"] | None = "left"
    url: str | None = None  # For image src or file download URL
    fileName: str | None = Field(None, alias="fileName")  # For file blocks
    fileSize: str | None = Field(None, alias="fileSize")  # For file blocks
    table: TableData | dict[str, Any] | None = None  # For table blocks
    metadata: dict[str, Any] | None = None  # Future-proof for other block metadata

    model_config = ConfigDict(extra="allow")

    @model_validator(mode="after")
    def _normalize_block(self) -> "DocumentBlock":
        # Ensure content is always a string to avoid validation failures on nulls
        if self.content is None:
            self.content = ""
        else:
            self.content = str(self.content)

        if self.type == "table":
            table_payload = self.table
            if table_payload is None:
                self.table = TableData()
            elif isinstance(table_payload, TableData):
                self.table = TableData.model_validate(table_payload.model_dump())
            elif isinstance(table_payload, dict):
                self.table = TableData.model_validate(table_payload)
            else:
                self.table = TableData()
        else:
            # Strip table payloads from non-table blocks to keep stored shape tidy
            self.table = None
        return self


def _utcnow() -> datetime:
    return datetime.now(UTC)


class DocumentOwner(BaseModel):
    id: str
    name: str
    role: Literal["admin", "manager", "employee", "secretary"]
    avatar: str | None = None


class DocumentUserRef(BaseModel):
    id: str
    name: str


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
    last_modified_by: DocumentUserRef | None = None
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


class EditHistoryEvent(Document):
    document_id: str
    editor_id: str
    editor_name: str
    at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "edit_history"
        indexes = ["document_id", "at"]

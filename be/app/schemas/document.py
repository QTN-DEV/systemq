"""Document schema definitions."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DocumentOwnerSchema(BaseModel):
    id: str
    name: str
    role: Literal["admin", "manager", "employee", "secretary"]
    avatar: str | None = None


class DocumentBase(BaseModel):
    name: str
    title: str | None = None
    type: Literal["folder", "file"]
    category: str | None = None
    status: Literal["active", "archived", "shared", "private"] = "active"
    parent_id: str | None = None
    shared: bool = False
    share_url: str | None = None


class DocumentCreate(BaseModel):
    name: str
    type: Literal["folder", "file"] = "file"
    parent_id: str | None = None


class DocumentUpdate(BaseModel):
    name: str | None = None
    title: str | None = None
    category: str | None = None
    status: Literal["active", "archived", "shared", "private"] | None = None
    parent_id: str | None = None
    shared: bool | None = None
    share_url: str | None = None
    content: str | None = None


class DocumentResponse(DocumentBase):
    id: str
    owned_by: DocumentOwnerSchema
    date_created: datetime
    last_modified: datetime
    size: str | None = None
    item_count: int | None = None
    path: list[str] = Field(default_factory=list)
    content: str | None = None

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
        }


class DocumentBreadcrumbSchema(BaseModel):
    id: str
    name: str
    path: list[str]


class ItemCountResponse(BaseModel):
    count: int


class DistinctValuesResponse(BaseModel):
    values: list[str]

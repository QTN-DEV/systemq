"""Document schema definitions."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class QDrivePermissionSchema(BaseModel):
    user_id: str | None = None
    division_id: str | None = None
    permission: Literal["viewer", "editor"]


class DocumentCreate(BaseModel):
    name: str
    type: Literal["folder", "file"]
    category: str | None = None
    parent_id: str | None = None
    content: str | None = None
    permissions: list[QDrivePermissionSchema] = Field(default_factory=list)


class DocumentUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    content: str | None = None
    permissions: list[QDrivePermissionSchema] | None = None


class DocumentResponse(BaseModel):
    id: str
    name: str
    type: Literal["folder", "file"]
    creator_id: str
    category: str | None = None
    parent_id: str | None = None
    content: str | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    permissions: list[dict] = Field(default_factory=list)


class DocumentBreadcrumbSchema(BaseModel):
    id: str
    name: str
    path: list[str]


class ItemCountResponse(BaseModel):
    count: int


class DistinctValuesResponse(BaseModel):
    values: list[str]

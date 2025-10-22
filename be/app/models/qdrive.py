"""QDrive model definitions."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from beanie import Document
from pydantic import BaseModel, Field


class QDrivePermission(BaseModel):
    user_id: str | None = None
    division_id: str | None = None
    permission: Literal["viewer", "editor"]


class QDrive(Document):
    name: str
    type: Literal["folder", "file"]
    creator_id: str
    category: str | None = None
    parent_id: str | None = None
    content: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    deleted_at: datetime | None = None

    permissions: list[QDrivePermission] = Field(default_factory=list)

    class Settings:
        name = "qdrives"
        indexes = ["parent_id", "category", "type", "deleted_at"]

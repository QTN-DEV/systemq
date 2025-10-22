"""QDrive model definitions."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from beanie import Document
from pydantic import BaseModel, Field


class QDrivePermission(BaseModel):
    user_id: str | None = None
    division_id: str | None = None
    permission: Literal["viewer", "editor"]

    async def resolve_fk(self) -> dict[str, Any]:
        from app.models.user import User

        if self.user_id:
            user = await User.find_one(User.id == self.user_id)
            if user:
                return {
                    "user": user.model_dump(include={"employee_id", "name", "title", "avatar"}),
                    "permission": self.permission,
                }

        return {
            "division": {
                "id": self.division_id,
            },
            "permission": self.permission,
        }


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


class QDriveSnapshot(Document):
    qdrive_id: str
    qdrive: QDrive
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    changer_id: str

    class Settings:
        name = "qdrive_snapshots"
        indexes = ["qdrive_id"]

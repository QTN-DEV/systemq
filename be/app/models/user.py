"""User model definitions."""

from __future__ import annotations

from datetime import datetime

from beanie import Document
from pydantic import EmailStr, Field, HttpUrl

from app.models.enums import EmploymentTypeLiteral, PositionLiteral


class User(Document):
    employee_id: str | None = None
    name: str
    email: EmailStr
    title: str | None = None
    division: str | None = None
    level: str | None = None
    position: PositionLiteral | None = None
    employment_type: EmploymentTypeLiteral = Field(default="full-time")
    subordinates: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    avatar: HttpUrl | None = None
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = ["email", "employee_id"]

    async def touch(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()

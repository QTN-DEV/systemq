"""Employee schema definitions."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, HttpUrl

from app.models.enums import EmploymentTypeLiteral, PositionLiteral


class EmployeeBase(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    title: str | None = None
    division: str | None = None
    level: str | None = None
    position: PositionLiteral | None = None
    subordinates: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    avatar: HttpUrl | None = None
    employment_type: EmploymentTypeLiteral = Field(default="full-time")


class EmployeeCreate(EmployeeBase):
    id: str = Field(min_length=1)


class Employee(EmployeeBase):
    id: str

"""InitiativeProject schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class InitiativeProjectBase(BaseModel):
    initiative_id: str
    key: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str | None = None
    status: str = "planned"
    owner_id: str | None = None


class InitiativeProjectCreate(InitiativeProjectBase):
    pass


class InitiativeProjectUpdate(BaseModel):
    key: str | None = Field(default=None, min_length=1)
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    status: str | None = None
    owner_id: str | None = None
    deleted_at: datetime | None = None


class InitiativeProjectResponse(InitiativeProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

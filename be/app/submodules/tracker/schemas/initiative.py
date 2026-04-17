"""Initiative schemas."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class InitiativeBase(BaseModel):
    product_id: str
    key: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str | None = None
    status: str = "planned"
    owner_id: str | None = None
    target_date: date | None = None


class InitiativeCreate(InitiativeBase):
    pass


class InitiativeUpdate(BaseModel):
    key: str | None = Field(default=None, min_length=1)
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    status: str | None = None
    owner_id: str | None = None
    target_date: date | None = None
    archived_at: datetime | None = None


class InitiativeResponse(InitiativeBase):
    id: str
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None

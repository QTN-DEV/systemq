"""Product schemas."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    key: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str | None = None
    status: str = "planned"
    owner_id: str | None = None
    target_date: date | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    key: str | None = Field(default=None, min_length=1)
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    status: str | None = None
    owner_id: str | None = None
    target_date: date | None = None
    archived_at: datetime | None = None


class ProductResponse(ProductBase):
    id: str
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None

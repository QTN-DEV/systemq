"""Document schema definitions."""

from __future__ import annotations

from pydantic import BaseModel


class DocumentBreadcrumbSchema(BaseModel):
    id: str
    name: str
    path: list[str]


class ItemCountResponse(BaseModel):
    count: int


class DistinctValuesResponse(BaseModel):
    values: list[str]

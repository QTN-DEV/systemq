from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from .models import StandupEntry


class SearchStandUpEntryOptions(BaseModel):
    content: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=99999)


class PaginatedStandUpEntries(BaseModel):
    items: list[StandupEntry]
    total: int
    page: int
    page_size: int
    total_pages: int

"""TrackerConfig schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class TrackerConfigResponse(BaseModel):
    config_type: str
    values: list[str]
    updated_at: datetime | None = None


class TrackerConfigUpdate(BaseModel):
    values: list[str]

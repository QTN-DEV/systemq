"""Beanie document model for the dynamic_dashboard submodule."""

from __future__ import annotations

from beanie import Document
from pydantic import ConfigDict, Field
from pymongo import IndexModel, ASCENDING


class DynamicDashboard(Document):
    """One document per user; stores their current dashboard source and version."""

    user_id: str
    content: str = Field(default="")
    version: int = Field(default=1)

    model_config = ConfigDict(populate_by_name=True)

    class Settings:
        name = "dynamic_dashboard"
        indexes = [
            IndexModel([("user_id", ASCENDING)], unique=True),
        ]

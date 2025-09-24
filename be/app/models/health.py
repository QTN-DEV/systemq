"""Health model definitions."""

from __future__ import annotations

from beanie import Document


class SystemStatus(Document):
    message: str

    class Settings:
        name = "system_status"

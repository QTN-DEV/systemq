"""Workspace metadata stored in MongoDB; on-disk layout uses Document id as folder name."""

from __future__ import annotations

from beanie import Document
from pydantic import Field


class WorkspaceMetadata(Document):
    """Workspace identity; the physical directory is ``{storage_root}/{id}``."""

    name: str
    owner_id: str = Field(..., description="Matches auth profile id (employee_id or str(User.id)).")

    class Settings:
        name = "workspaces"
        indexes = ["owner_id"]

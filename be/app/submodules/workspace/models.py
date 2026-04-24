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


class WorkspaceChat(Document):
    """Persisted chat thread for a workspace; ``messages`` is an opaque string (e.g. JSON)."""

    workspace_id: str = Field(
        ...,
        description="Workspace document id (MongoDB ObjectId as string).",
    )
    messages: str = Field(
        default="[]",
        description="Stringified messages payload (e.g. JSON array string).",
    )

    class Settings:
        name = "workspace_chats"
        indexes = ["workspace_id"]

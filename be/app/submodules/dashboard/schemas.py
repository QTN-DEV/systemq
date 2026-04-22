"""Pydantic request/response schemas for the dynamic_dashboard submodule."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Request Schemas ────────────────────────────────────────────────────────

class DashboardUpdate(BaseModel):
    """Payload for updating the user's dashboard content.

    ``target_version`` must match the document's current version;
    otherwise a 409 Conflict is returned (Optimistic Concurrency Control).
    """

    content: str
    target_version: int = Field(ge=1)


# ── Response Schemas ───────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    """Represents the full dashboard state returned to the client."""

    user_id: str
    content: str
    version: int

    model_config = {"from_attributes": True}

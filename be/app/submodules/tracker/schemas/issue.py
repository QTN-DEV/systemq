"""Issue schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class IssueBase(BaseModel):
    initiative_project_id: str | None = None
    parent_issue_id: str | None = None
    title: str = Field(min_length=1)
    description: str | None = None
    status: str = "triage"
    priority: int = Field(default=3, ge=0, le=4)
    assignee_id: str | None = None
    reporter_id: str | None = None
    triage_owner_id: str | None = None


class IssueCreate(IssueBase):
    pass


class IssueUpdate(BaseModel):
    initiative_project_id: str | None = None
    parent_issue_id: str | None = None
    title: str | None = Field(default=None, min_length=1)
    description: str | None = None
    status: str | None = None
    priority: int | None = Field(default=None, ge=0, le=4)
    assignee_id: str | None = None
    reporter_id: str | None = None
    triage_owner_id: str | None = None
    archived_at: datetime | None = None


class IssueResponse(IssueBase):
    id: str
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None
    archived_at: datetime | None = None

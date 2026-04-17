"""Issue service."""

from __future__ import annotations

from datetime import UTC, datetime

from beanie import PydanticObjectId

from app.submodules.tracker.models.event import IssueEvent
from app.submodules.tracker.models.issue import TrackerIssue
from app.submodules.tracker.services.config import get_allowed_statuses

_CLOSED_STATUSES = {"done", "canceled"}


class IssueNotFoundError(ValueError):
    pass


class InvalidStatusError(ValueError):
    pass


async def _validate_issue_status(status: str) -> None:
    allowed = await get_allowed_statuses("issue_status")
    if status not in allowed:
        raise InvalidStatusError(f"Invalid status '{status}'. Allowed: {allowed}")


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _serialize(issue: TrackerIssue) -> dict:
    return {
        "id": str(issue.id),
        "initiative_project_id": str(issue.initiative_project_id) if issue.initiative_project_id else None,
        "parent_issue_id": str(issue.parent_issue_id) if issue.parent_issue_id else None,
        "title": issue.title,
        "description": issue.description,
        "status": issue.status,
        "priority": issue.priority,
        "assignee_id": str(issue.assignee_id) if issue.assignee_id else None,
        "reporter_id": str(issue.reporter_id) if issue.reporter_id else None,
        "triage_owner_id": str(issue.triage_owner_id) if issue.triage_owner_id else None,
        "created_at": issue.created_at,
        "updated_at": issue.updated_at,
        "closed_at": issue.closed_at,
        "archived_at": issue.archived_at,
    }


async def list_issues(
    initiative_project_id: str | None = None,
    status: str | None = None,
    assignee_id: str | None = None,
    priority: int | None = None,
) -> list[dict]:
    filters = []
    if initiative_project_id:
        filters.append(TrackerIssue.initiative_project_id == PydanticObjectId(initiative_project_id))
    if status:
        filters.append(TrackerIssue.status == status)
    if assignee_id:
        filters.append(TrackerIssue.assignee_id == PydanticObjectId(assignee_id))
    if priority is not None:
        filters.append(TrackerIssue.priority == priority)

    query = TrackerIssue.find(*filters)
    issues = await query.to_list()
    return [_serialize(i) for i in issues]


async def get_issue_by_id(issue_id: str) -> dict:
    issue = await TrackerIssue.get(PydanticObjectId(issue_id))
    if issue is None:
        raise IssueNotFoundError(f"Issue '{issue_id}' not found")
    return _serialize(issue)


async def list_events(issue_id: str) -> list[dict]:
    events = await IssueEvent.find(
        IssueEvent.issue_id == PydanticObjectId(issue_id)
    ).sort("-created_at").to_list()
    return [
        {
            "id": str(e.id),
            "issue_id": str(e.issue_id),
            "actor_id": str(e.actor_id) if e.actor_id else None,
            "event_type": e.event_type,
            "payload": e.payload,
            "created_at": e.created_at,
        }
        for e in events
    ]


async def create_issue(
    title: str,
    *,
    initiative_project_id: str | None = None,
    parent_issue_id: str | None = None,
    description: str | None = None,
    status: str = "triage",
    priority: int = 3,
    assignee_id: str | None = None,
    reporter_id: str | None = None,
    triage_owner_id: str | None = None,
) -> dict:
    await _validate_issue_status(status)
    issue = TrackerIssue(
        title=title,
        initiative_project_id=PydanticObjectId(initiative_project_id) if initiative_project_id else None,
        parent_issue_id=PydanticObjectId(parent_issue_id) if parent_issue_id else None,
        description=description,
        status=status,
        priority=priority,
        assignee_id=PydanticObjectId(assignee_id) if assignee_id else None,
        reporter_id=PydanticObjectId(reporter_id) if reporter_id else None,
        triage_owner_id=PydanticObjectId(triage_owner_id) if triage_owner_id else None,
        closed_at=_utcnow() if status in _CLOSED_STATUSES else None,
    )
    await issue.insert()

    event = IssueEvent(
        issue_id=issue.id,
        event_type="created",
        payload={"status": status},
    )
    await event.insert()

    return _serialize(issue)


async def update_issue(issue_id: str, actor_id: str | None = None, **kwargs) -> dict:
    issue = await TrackerIssue.get(PydanticObjectId(issue_id))
    if issue is None:
        raise IssueNotFoundError(f"Issue '{issue_id}' not found")

    events: list[IssueEvent] = []
    old_status = issue.status

    if "initiative_project_id" in kwargs:
        raw = kwargs["initiative_project_id"]
        issue.initiative_project_id = PydanticObjectId(raw) if raw else None
    if "parent_issue_id" in kwargs:
        raw = kwargs["parent_issue_id"]
        if raw and raw == issue_id:
            raise ValueError("An issue cannot be its own parent")
        issue.parent_issue_id = PydanticObjectId(raw) if raw else None
    if "title" in kwargs and kwargs["title"] is not None:
        issue.title = kwargs["title"]
    if "description" in kwargs:
        issue.description = kwargs["description"]
    if "status" in kwargs and kwargs["status"] is not None:
        new_status = kwargs["status"]
        await _validate_issue_status(new_status)
        if new_status != old_status:
            issue.status = new_status
            if new_status in _CLOSED_STATUSES and issue.closed_at is None:
                issue.closed_at = _utcnow()
            elif new_status not in _CLOSED_STATUSES:
                issue.closed_at = None
            events.append(IssueEvent(
                issue_id=issue.id,
                actor_id=PydanticObjectId(actor_id) if actor_id else None,
                event_type="status_changed",
                payload={"from": old_status, "to": new_status},
            ))
    if "priority" in kwargs and kwargs["priority"] is not None:
        issue.priority = kwargs["priority"]
    if "assignee_id" in kwargs:
        raw = kwargs["assignee_id"]
        issue.assignee_id = PydanticObjectId(raw) if raw else None
        events.append(IssueEvent(
            issue_id=issue.id,
            actor_id=PydanticObjectId(actor_id) if actor_id else None,
            event_type="assigned",
            payload={"assignee_id": raw},
        ))
    if "reporter_id" in kwargs:
        raw = kwargs["reporter_id"]
        issue.reporter_id = PydanticObjectId(raw) if raw else None
    if "triage_owner_id" in kwargs:
        raw = kwargs["triage_owner_id"]
        issue.triage_owner_id = PydanticObjectId(raw) if raw else None
    if "archived_at" in kwargs:
        issue.archived_at = kwargs["archived_at"]

    await issue.touch()
    for ev in events:
        await ev.insert()

    return _serialize(issue)

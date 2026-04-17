"""Issue routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.submodules.tracker.schemas.comment import CommentCreate, CommentResponse, IssueEventResponse
from app.submodules.tracker.schemas.issue import IssueCreate, IssueResponse, IssueUpdate
from app.submodules.tracker.services import comment as comment_service
from app.submodules.tracker.services import issue as issue_service
from app.submodules.tracker.services.issue import (
    InvalidStatusError,
    IssueNotFoundError,
    archive_issue as svc_archive_issue,
    restore_issue as svc_restore_issue,
)

router = APIRouter(prefix="/issues", tags=["Tracker"])


@router.get("/", response_model=list[IssueResponse])
async def list_issues(
    initiative_project_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    assignee_id: str | None = Query(default=None),
    priority: int | None = Query(default=None, ge=0, le=4),
) -> list[IssueResponse]:
    items = await issue_service.list_issues(
        initiative_project_id=initiative_project_id,
        status=status_filter,
        assignee_id=assignee_id,
        priority=priority,
    )
    return [IssueResponse.model_validate(i) for i in items]


@router.post("/", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(payload: IssueCreate) -> IssueResponse:
    try:
        issue = await issue_service.create_issue(
            payload.title,
            initiative_project_id=payload.initiative_project_id,
            parent_issue_id=payload.parent_issue_id,
            description=payload.description,
            status=payload.status,
            priority=payload.priority,
            assignee_id=payload.assignee_id,
            reporter_id=payload.reporter_id,
            triage_owner_id=payload.triage_owner_id,
        )
    except InvalidStatusError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return IssueResponse.model_validate(issue)


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(issue_id: str) -> IssueResponse:
    try:
        issue = await issue_service.get_issue_by_id(issue_id)
    except IssueNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return IssueResponse.model_validate(issue)


@router.patch("/{issue_id}", response_model=IssueResponse)
async def update_issue(issue_id: str, payload: IssueUpdate) -> IssueResponse:
    try:
        issue = await issue_service.update_issue(issue_id, **payload.model_dump(exclude_unset=True))
    except IssueNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return IssueResponse.model_validate(issue)


@router.get("/{issue_id}/comments", response_model=list[CommentResponse])
async def list_comments(issue_id: str) -> list[CommentResponse]:
    items = await comment_service.list_comments(issue_id)
    return [CommentResponse.model_validate(c) for c in items]


@router.post("/{issue_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(issue_id: str, payload: CommentCreate) -> CommentResponse:
    c = await comment_service.create_comment(issue_id, payload.author_id, payload.body)
    return CommentResponse.model_validate(c)


@router.get("/{issue_id}/events", response_model=list[IssueEventResponse])
async def list_events(issue_id: str) -> list[IssueEventResponse]:
    events = await issue_service.list_events(issue_id)
    return [IssueEventResponse.model_validate(e) for e in events]


@router.patch("/{issue_id}/archive", response_model=IssueResponse)
async def archive_issue(issue_id: str) -> IssueResponse:
    try:
        issue = await svc_archive_issue(issue_id)
    except IssueNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return IssueResponse.model_validate(issue)


@router.patch("/{issue_id}/unarchive", response_model=IssueResponse)
async def unarchive_issue(issue_id: str) -> IssueResponse:
    try:
        issue = await svc_restore_issue(issue_id)
    except IssueNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return IssueResponse.model_validate(issue)

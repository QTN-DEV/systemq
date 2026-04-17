"""Comment service."""

from __future__ import annotations

from beanie import PydanticObjectId

from app.submodules.tracker.models.comment import IssueComment
from app.submodules.tracker.models.event import IssueEvent


class CommentNotFoundError(ValueError):
    pass


def _serialize(c: IssueComment) -> dict:
    return {
        "id": str(c.id),
        "issue_id": str(c.issue_id),
        "author_id": str(c.author_id),
        "body": c.body,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "deleted_at": c.deleted_at,
    }


async def list_comments(issue_id: str) -> list[dict]:
    comments = await IssueComment.find(
        IssueComment.issue_id == PydanticObjectId(issue_id),
        IssueComment.deleted_at == None,  # noqa: E711
    ).to_list()
    return [_serialize(c) for c in comments]


async def create_comment(issue_id: str, author_id: str, body: str) -> dict:
    c = IssueComment(
        issue_id=PydanticObjectId(issue_id),
        author_id=PydanticObjectId(author_id),
        body=body,
    )
    await c.insert()

    event = IssueEvent(
        issue_id=PydanticObjectId(issue_id),
        actor_id=PydanticObjectId(author_id),
        event_type="commented",
        payload={"comment_id": str(c.id)},
    )
    await event.insert()

    return _serialize(c)

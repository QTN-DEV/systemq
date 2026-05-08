from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from beanie import PydanticObjectId
from beanie.operators import Push
from pydantic import BaseModel, Field

from app.submodules.workspace_v2.documents import WorkspaceChat
from app.submodules.workspace_v2.schemas import WorkspaceChatListItem, WorkspaceChatListPage, WorkspaceChatMessagesPage, WorkspaceChatResponse, WorkspaceChatMessage

if TYPE_CHECKING:
    from ..workspace import WorkspaceHandle


class _ChatTitleProjection(BaseModel):
    id: PydanticObjectId = Field(alias="_id")
    title: str


class ChatsResource:
    """Persisted chat threads for a v2 workspace (MongoDB ``workspace_chats``)."""

    def __init__(self, workspace: WorkspaceHandle):
        self.workspace = workspace

    def _workspace_oid(self) -> PydanticObjectId:
        return PydanticObjectId(self.workspace.id)

    async def list(self, *, skip: int = 0, limit: int = 20) -> list[WorkspaceChatListItem]:
        """Chat ids for this workspace, newest first, with optional pagination."""
        wid = self._workspace_oid()
        chats: list[_ChatTitleProjection] = (
            await WorkspaceChat.find(
                WorkspaceChat.workspace_id == wid,
                projection_model=_ChatTitleProjection,
            )
            .sort(-WorkspaceChat.id)
            .skip(skip)
            .limit(limit)
            .to_list()
        )
        return [WorkspaceChatListItem(id=str(c.id), title=c.title) for c in chats]

    async def count(self) -> int:
        """Total number of chats in this workspace."""
        wid = self._workspace_oid()
        return await WorkspaceChat.find(WorkspaceChat.workspace_id == wid).count()

    async def create(self, *, messages: list[WorkspaceChatMessage] | None = None, title: str = "New Chat") -> WorkspaceChatResponse:
        """Insert a new chat document scoped to this workspace."""
        chat_title = (title or "").strip() or "New Chat"
        doc = WorkspaceChat(
            workspace_id=self.workspace.id,
            messages=messages or [],
            title=chat_title,
        )
        await doc.insert()
        return WorkspaceChatResponse(
            id=str(doc.id),
            workspace_id=str(doc.workspace_id),
            messages=doc.messages,
            title=doc.title,
        )

    async def get(self, chat_id: str) -> WorkspaceChatResponse:
        """Load a chat by id; must belong to this workspace."""
        try:
            cid = PydanticObjectId(chat_id)
        except Exception as exc:
            raise ValueError("Invalid chat id") from exc
        chat = await WorkspaceChat.get(cid)
        if chat is None:
            raise FileNotFoundError("Chat not found")
        if chat.workspace_id != self._workspace_oid():
            raise FileNotFoundError("Chat not found")
        return WorkspaceChatResponse(
            id=str(chat.id),
            workspace_id=str(chat.workspace_id),
            messages=chat.messages,
            title=chat.title,
        )

    async def update(self, chat_id: str, *, messages: list[WorkspaceChatMessage] | None = None, title: str | None = None) -> WorkspaceChatResponse:
        try:
            cid = PydanticObjectId(chat_id)
        except Exception as exc:
            raise ValueError("Invalid chat id") from exc
        chat = await WorkspaceChat.get(cid)
        if chat is None or chat.workspace_id != self._workspace_oid():
            raise FileNotFoundError("Chat not found")
        
        if messages is not None:
            chat.messages = messages
        if title is not None:
            chat.title = title
        await chat.save()
        
        return WorkspaceChatResponse(
            id=str(chat.id),
            workspace_id=str(chat.workspace_id),
            messages=chat.messages,
            title=chat.title,
        )

    async def get_messages(
        self,
        chat_id: str,
        *,
        cursor: Optional[str] = None,
        limit: int = 30,
    ) -> WorkspaceChatMessagesPage:
        """Return a page of messages, chronological order (oldest→newest within the page).

        ``cursor`` is the ``id`` of the oldest message from the previous page.
        We find its position in the array and return up to ``limit`` messages
        that come *before* it, so the caller can keep scrolling backwards.

        When ``cursor`` is omitted the most recent ``limit`` messages are returned.

        Uses MongoDB aggregation with ``$slice`` so only the requested slice is
        transferred from the database.
        """
        try:
            cid = PydanticObjectId(chat_id)
        except Exception as exc:
            raise ValueError("Invalid chat id") from exc

        wid = self._workspace_oid()

        if cursor:
            # Find the index of the message whose id == cursor, then slice backwards
            pipeline: list[dict] = [
                {"$match": {"_id": cid, "workspace_id": wid}},
                {
                    "$addFields": {
                        "cursor_idx": {
                            "$indexOfArray": ["$messages.id", cursor]
                        }
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "total": {"$size": "$messages"},
                        "cursor_idx": 1,
                        # slice from max(0, cursor_idx - limit) for limit items
                        "messages": {
                            "$slice": [
                                "$messages",
                                {"$max": [0, {"$subtract": ["$cursor_idx", limit]}]},
                                limit,
                            ]
                        },
                    }
                },
            ]
        else:
            pipeline = [
                {"$match": {"_id": cid, "workspace_id": wid}},
                {
                    "$project": {
                        "_id": 0,
                        "total": {"$size": "$messages"},
                        "cursor_idx": {"$size": "$messages"},  # sentinel: past the end
                        "messages": {"$slice": ["$messages", -limit]},
                    }
                },
            ]

        results = await WorkspaceChat.get_pymongo_collection().aggregate(pipeline).to_list(1)
        if not results:
            raise FileNotFoundError("Chat not found")

        row = results[0]
        cursor_idx: int = row.get("cursor_idx", 0)
        raw_messages: list[dict] = row.get("messages", [])

        # batch starts at max(0, cursor_idx - limit)
        batch_start = max(0, cursor_idx - limit)
        # There are older messages if batch_start > 0; the cursor for the next
        # (older) page is the id of the first message in this batch.
        prev_cursor: Optional[str] = (
            raw_messages[0].get("id") if batch_start > 0 and raw_messages else None
        )

        messages = [WorkspaceChatMessage(**m) for m in raw_messages]
        return WorkspaceChatMessagesPage(messages=messages, prev_cursor=prev_cursor)

    async def append_message(self, chat_id: str, message: WorkspaceChatMessage) -> None:
        """Push a single message onto the chat's messages array via $push (no full read/write)."""
        try:
            cid = PydanticObjectId(chat_id)
        except Exception as exc:
            raise ValueError("Invalid chat id") from exc
        result = await WorkspaceChat.find_one(
            WorkspaceChat.id == cid,
            WorkspaceChat.workspace_id == self._workspace_oid(),
        ).update(Push({WorkspaceChat.messages: message.model_dump()}))
        if result is None or result.matched_count == 0:
            raise FileNotFoundError("Chat not found")

    async def delete(self, chat_id: str) -> None:
        """Delete a chat by id; must belong to this workspace."""
        try:
            cid = PydanticObjectId(chat_id)
        except Exception as exc:
            raise ValueError("Invalid chat id") from exc
        chat = await WorkspaceChat.get(cid)
        if chat is None or chat.workspace_id != self._workspace_oid():
            raise FileNotFoundError("Chat not found")
        await chat.delete()

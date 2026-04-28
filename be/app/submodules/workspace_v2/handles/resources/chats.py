from __future__ import annotations

from typing import TYPE_CHECKING

from beanie import PydanticObjectId

from app.submodules.workspace_v2.documents import WorkspaceChat
from app.submodules.workspace_v2.schemas import WorkspaceChatListItem, WorkspaceChatResponse, WorkspaceChatMessage

if TYPE_CHECKING:
    from ..workspace import WorkspaceHandle


class ChatsResource:
    """Persisted chat threads for a v2 workspace (MongoDB ``workspace_chats``)."""

    def __init__(self, workspace: WorkspaceHandle):
        self.workspace = workspace

    def _workspace_oid(self) -> PydanticObjectId:
        return PydanticObjectId(self.workspace.id)

    async def list(self, *, skip: int = 0, limit: int = 20) -> list[WorkspaceChatListItem]:
        """Chat ids for this workspace, newest first, with optional pagination."""
        wid = self._workspace_oid()
        chats = (
            await WorkspaceChat.find(WorkspaceChat.workspace_id == wid)
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

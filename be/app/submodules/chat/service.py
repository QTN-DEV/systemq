from __future__ import annotations

from beanie import PydanticObjectId

from .documents import ChatThread, ChatThreadMessage
from .handles import ThreadHandle, ThreadHandleOptions
from .schemas import (
    ChatThreadListItem,
    ChatThreadMessageSchema,
    ChatThreadResponse,
)


class ChatService:
    async def list(self, user_id: str, *, skip: int = 0, limit: int = 20) -> list[ChatThreadListItem]:
        uid = PydanticObjectId(user_id)
        chats = (
            await ChatThread.find(ChatThread.user_id == uid)
            .sort(-ChatThread.id)
            .skip(skip)
            .limit(limit)
            .to_list()
        )
        return [ChatThreadListItem(id=str(c.id), title=c.title) for c in chats]

    async def count(self, user_id: str) -> int:
        uid = PydanticObjectId(user_id)
        return await ChatThread.find(ChatThread.user_id == uid).count()

    async def create(
        self,
        user_id: str,
        *,
        title: str = "New Chat",
        messages: list[ChatThreadMessageSchema] | None = None,
    ) -> ThreadHandle:
        chat_title = (title or "").strip() or "New Chat"
        doc = ChatThread(
            user_id=PydanticObjectId(user_id),
            title=chat_title,
            messages=[ChatThreadMessage(**m.model_dump()) for m in (messages or [])],
        )
        await doc.insert()
        return self.get(user_id, str(doc.id))

    def get(self, user_id: str, thread_id: str) -> ThreadHandle:
        return ThreadHandle(ThreadHandleOptions(user_id=user_id, thread_id=thread_id))
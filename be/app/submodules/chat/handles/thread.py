from __future__ import annotations

from beanie import PydanticObjectId
from pydantic import BaseModel, ConfigDict

from app.submodules.chat.documents import ChatThread, ChatThreadMessage
from app.submodules.chat.schemas import (
    ChatThreadMessageSchema,
    ChatThreadResponse,
)


class ThreadHandleOptions(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: str
    thread_id: str


class ThreadHandle:
    def __init__(self, options: ThreadHandleOptions):
        self.options = options

    @property
    def user_id(self) -> str:
        return self.options.user_id

    @property
    def thread_id(self) -> str:
        return self.options.thread_id

    def _user_oid(self) -> PydanticObjectId:
        return PydanticObjectId(self.user_id)

    def _thread_oid(self) -> PydanticObjectId:
        try:
            return PydanticObjectId(self.thread_id)
        except Exception as exc:
            raise ValueError("Invalid thread id") from exc

    async def _get_doc(self) -> ChatThread:
        doc = await ChatThread.get(self._thread_oid())
        if doc is None or doc.user_id != self._user_oid():
            raise FileNotFoundError("Chat thread not found")
        return doc

    def _to_response(self, chat: ChatThread) -> ChatThreadResponse:
        return ChatThreadResponse(
            id=str(chat.id),
            user_id=str(chat.user_id),
            title=chat.title,
            messages=[ChatThreadMessageSchema(**m.model_dump()) for m in chat.messages],
        )

    async def get(self) -> ChatThreadResponse:
        doc = await self._get_doc()
        return self._to_response(doc)

    async def update(
        self,
        *,
        title: str | None = None,
        messages: list[ChatThreadMessageSchema] | None = None,
    ) -> ChatThreadResponse:
        doc = await self._get_doc()
        if title is not None:
            doc.title = title
        if messages is not None:
            doc.messages = [ChatThreadMessage(**m.model_dump()) for m in messages]
        await doc.save()
        return self._to_response(doc)

    async def append_message(self, message: ChatThreadMessageSchema) -> ChatThreadResponse:
        doc = await self._get_doc()
        doc.messages.append(ChatThreadMessage(**message.model_dump()))
        await doc.save()
        return self._to_response(doc)

    async def delete(self) -> None:
        doc = await self._get_doc()
        await doc.delete()

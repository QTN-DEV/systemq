from typing import Annotated

from fastapi import Depends

from app.submodules.auth import UseAuthContext
from .service import ChatService
from .handles import ThreadHandle

UseChatService = Annotated[ChatService, Depends()]


async def get_thread_handle(
    service: UseChatService,
    ctx: UseAuthContext,
    thread_id: str,
) -> ThreadHandle:
    """Dependency to provide a ThreadHandle for a specific thread_id."""
    return service.get(ctx.user.id, thread_id)


UseThread = Annotated[ThreadHandle, Depends(get_thread_handle)]
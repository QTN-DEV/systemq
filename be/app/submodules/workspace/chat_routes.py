"""Workspace chat persistence (MongoDB collection ``workspace_chats``)."""

from __future__ import annotations

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from .deps import auth_owner_id, get_owned_workspace
from .models import WorkspaceChat
from .schemas import (
    WorkspaceChatCreatedResponse,
    WorkspaceChatCreate,
    WorkspaceChatListItem,
    WorkspaceChatMessagesUpdate,
    WorkspaceChatResponse,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


async def _get_chat_for_workspace(chat_id: str, workspace_id: str) -> WorkspaceChat:
    try:
        cid = PydanticObjectId(chat_id)
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid chat id") from exc
    chat = await WorkspaceChat.get(cid)
    if chat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat not found")
    if chat.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat not found")
    return chat


@router.post(
    "/{workspace_id}/chats",
    response_model=WorkspaceChatCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a workspace chat document",
)
async def create_workspace_chat(
    workspace_id: str,
    payload: WorkspaceChatCreate,
    owner_id: str = Depends(auth_owner_id),
) -> WorkspaceChatCreatedResponse:
    await get_owned_workspace(workspace_id, owner_id)
    doc = WorkspaceChat(workspace_id=workspace_id, messages=payload.messages)
    await doc.insert()
    return WorkspaceChatCreatedResponse(id=str(doc.id))


@router.get(
    "/{workspace_id}/chats",
    response_model=list[WorkspaceChatListItem],
    summary="List chat ids for a workspace",
)
async def list_workspace_chats(
    workspace_id: str,
    owner_id: str = Depends(auth_owner_id),
) -> list[WorkspaceChatListItem]:
    await get_owned_workspace(workspace_id, owner_id)
    chats = await WorkspaceChat.find(WorkspaceChat.workspace_id == workspace_id).sort(
        -WorkspaceChat.id
    ).to_list()
    return [WorkspaceChatListItem(id=str(c.id)) for c in chats]


@router.get(
    "/{workspace_id}/chats/{chat_id}",
    response_model=WorkspaceChatResponse,
    summary="Get a workspace chat by id",
)
async def get_workspace_chat(
    workspace_id: str,
    chat_id: str,
    owner_id: str = Depends(auth_owner_id),
) -> WorkspaceChatResponse:
    await get_owned_workspace(workspace_id, owner_id)
    chat = await _get_chat_for_workspace(chat_id, workspace_id)
    return WorkspaceChatResponse(
        id=str(chat.id),
        workspace_id=chat.workspace_id,
        messages=chat.messages,
    )


@router.put(
    "/{workspace_id}/chats/{chat_id}",
    response_model=WorkspaceChatResponse,
    summary="Replace stored messages string for a chat",
)
async def update_workspace_chat_messages(
    workspace_id: str,
    chat_id: str,
    payload: WorkspaceChatMessagesUpdate,
    owner_id: str = Depends(auth_owner_id),
) -> WorkspaceChatResponse:
    await get_owned_workspace(workspace_id, owner_id)
    chat = await _get_chat_for_workspace(chat_id, workspace_id)
    chat.messages = payload.messages
    await chat.save()
    return WorkspaceChatResponse(
        id=str(chat.id),
        workspace_id=chat.workspace_id,
        messages=chat.messages,
    )


@router.delete(
    "/{workspace_id}/chats/{chat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a workspace chat",
)
async def delete_workspace_chat(
    workspace_id: str,
    chat_id: str,
    owner_id: str = Depends(auth_owner_id),
) -> None:
    await get_owned_workspace(workspace_id, owner_id)
    chat = await _get_chat_for_workspace(chat_id, workspace_id)
    await chat.delete()

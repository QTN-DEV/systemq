"""Workspace chat persistence (MongoDB collection ``workspace_chats``)."""

from __future__ import annotations

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.submodules.workspace_v2.documents import WorkspaceChat

from .deps import auth_owner_id, get_owned_workspace
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
        wid = PydanticObjectId(workspace_id)
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid id") from exc
    chat = await WorkspaceChat.get(cid)
    if chat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat not found")
    if chat.workspace_id != wid:
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
    try:
        wid = PydanticObjectId(workspace_id)
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid workspace id") from exc
    doc = WorkspaceChat(workspace_id=wid, messages=payload.messages)
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
    try:
        wid = PydanticObjectId(workspace_id)
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid workspace id") from exc
    chats = await WorkspaceChat.find(WorkspaceChat.workspace_id == wid).sort(
        -WorkspaceChat.id
    ).to_list()
    return [WorkspaceChatListItem(id=str(c.id), title=c.title) for c in chats]


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
        workspace_id=str(chat.workspace_id),
        messages=chat.messages,
        title=chat.title,
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

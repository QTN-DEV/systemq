"""Shared auth and ownership checks for workspace HTTP handlers."""

from __future__ import annotations

from beanie import PydanticObjectId
from fastapi import Header, HTTPException, status

from app.services import auth as auth_service
from app.services.auth import AuthenticationError, UserNotFoundError

from .models import WorkspaceMetadata


async def auth_owner_id(authorization: str = Header(alias="Authorization")) -> str:
    try:
        token = auth_service.parse_bearer_token(authorization)
        profile = await auth_service.get_user_profile_from_token(token)
    except AuthenticationError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return str(profile["id"])


async def get_owned_workspace(workspace_id: str, owner_id: str) -> WorkspaceMetadata:
    try:
        oid = PydanticObjectId(workspace_id)
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid workspace id") from exc
    ws = await WorkspaceMetadata.get(oid)
    if ws is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    if ws.owner_id != owner_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not allowed for this workspace")
    return ws

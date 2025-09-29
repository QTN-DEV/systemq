"""Document permission routes."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status

from app.schemas import MessageResponse, UserProfile
from app.schemas.document_permission import (
    AddDivisionPermissionRequest,
    AddUserPermissionRequest,
    DocumentPermissionsResponse,
    UpdatePermissionRequest,
)
from app.services import auth as auth_service
from app.services.auth import AuthenticationError, UserNotFoundError
from app.services.document_permission import (
    DocumentPermissionError,
    add_division_permission,
    add_user_permission,
    get_document_permissions,
    remove_division_permission,
    remove_user_permission,
)
from app.services.document import DocumentNotFoundError

router = APIRouter(prefix="/documents", tags=["Document Permissions"])


async def _get_current_user(authorization: str) -> UserProfile:
    """Get current user from authorization header."""
    token = auth_service.parse_bearer_token(authorization)
    try:
        user_data = await auth_service.get_user_profile_from_token(token=token)
        print(user_data)
    except (AuthenticationError, UserNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    return UserProfile.model_validate(user_data)


@router.get(
    "/{document_id}/permissions",
    response_model=DocumentPermissionsResponse,
    summary="Get document permissions",
    response_description="List of all permissions for the document.",
)
async def get_permissions(
    document_id: str,
    authorization: str = Header(alias="Authorization"),
) -> DocumentPermissionsResponse:
    """Get all permissions for a document. Only document owner or editors can view permissions."""
    user = await _get_current_user(authorization)

    # Check if user has editor access to view permissions
    from app.services.document_permission import get_user_document_permission

    # if document_id == "something.pdf":
    #     print("user id:", user.id)

    user_permission = await get_user_document_permission(document_id, user.id)

    # if document_id == "something.pdf":
    #     print("user permission:", user_permission)

    if user_permission not in ["owner", "editor", "viewer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only document owners and editors can view permissions",
        )

    try:
        permissions = await get_document_permissions(document_id)
        return DocumentPermissionsResponse(**permissions)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/{document_id}/permissions/users",
    response_model=MessageResponse,
    summary="Add user permission",
    response_description="Confirmation that user permission was added.",
)
async def add_user_permission_endpoint(
    document_id: str,
    payload: AddUserPermissionRequest,
    authorization: str = Header(alias="Authorization"),
) -> MessageResponse:
    """Add or update individual user permission for a document."""
    user = await _get_current_user(authorization)

    # Check if user has editor access
    from app.services.document_permission import get_user_document_permission

    user_permission = await get_user_document_permission(document_id, user.id)

    if user_permission != "editor" and user_permission != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only document owners and editors can manage permissions",
        )

    try:
        await add_user_permission(
            document_id=document_id,
            user_id=payload.user_id,
            user_name=payload.user_name,
            user_email=payload.user_email,
            permission=payload.permission,
        )
        return MessageResponse(message="User permission added successfully.")
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/{document_id}/permissions/divisions",
    response_model=MessageResponse,
    summary="Add division permission",
    response_description="Confirmation that division permission was added.",
)
async def add_division_permission_endpoint(
    document_id: str,
    payload: AddDivisionPermissionRequest,
    authorization: str = Header(alias="Authorization"),
) -> MessageResponse:
    """Add or update division permission for a document."""
    user = await _get_current_user(authorization)

    # Check if user has editor access
    from app.services.document_permission import get_user_document_permission

    user_permission = await get_user_document_permission(document_id, user.id)

    if user_permission != "editor" and user_permission != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only document owners and editors can manage permissions",
        )

    try:
        await add_division_permission(
            document_id=document_id, division=payload.division, permission=payload.permission
        )
        return MessageResponse(message="Division permission added successfully.")
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete(
    "/{document_id}/permissions/users/{user_id}",
    response_model=MessageResponse,
    summary="Remove user permission",
    response_description="Confirmation that user permission was removed.",
)
async def remove_user_permission_endpoint(
    document_id: str,
    user_id: str,
    authorization: str = Header(alias="Authorization"),
) -> MessageResponse:
    """Remove individual user permission from a document."""
    user = await _get_current_user(authorization)

    # Check if user has editor access
    from app.services.document_permission import get_user_document_permission

    user_permission = await get_user_document_permission(document_id, user.id)

    if user_permission != "editor" and user_permission != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only document owners and editors can manage permissions",
        )

    try:
        await remove_user_permission(document_id=document_id, user_id=user_id)
        return MessageResponse(message="User permission removed successfully.")
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete(
    "/{document_id}/permissions/divisions/{division}",
    response_model=MessageResponse,
    summary="Remove division permission",
    response_description="Confirmation that division permission was removed.",
)
async def remove_division_permission_endpoint(
    document_id: str,
    division: str,
    authorization: str = Header(alias="Authorization"),
) -> MessageResponse:
    """Remove division permission from a document."""
    user = await _get_current_user(authorization)

    # Check if user has editor access
    from app.services.document_permission import get_user_document_permission

    user_permission = await get_user_document_permission(document_id, user.id)

    if user_permission != "editor" and user_permission != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only document owners and editors can manage permissions",
        )

    try:
        await remove_division_permission(document_id=document_id, division=division)
        return MessageResponse(message="Division permission removed successfully.")
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

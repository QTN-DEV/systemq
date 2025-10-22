"""Document permission routes."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status

from app.logging_utils import get_logger, log_info
from app.models.qdrive import QDrive, QDrivePermission
from app.schemas import MessageResponse, UserProfile
from app.schemas.document_permission import (
    AddDivisionPermissionRequest,
    AddUserPermissionRequest,
    DivisionPermissionSchema,
    DocumentPermissionSchema,
    DocumentPermissionsResponse,
)
from app.services import auth as auth_service
from app.services.auth import AuthenticationError, UserNotFoundError

router = APIRouter(prefix="/documents", tags=["Document Permissions"])
logger = get_logger(__name__)


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


def _is_admin(user: UserProfile) -> bool:
    level = (user.level or "").strip().lower()
    return level == "admin"


@router.get(
    "/{document_id}/permissions",
    response_model=DocumentPermissionsResponse,
    summary="Get document permissions",
    response_description="List of all permissions for the document.",
)
async def get_permissions(
    document_id: str,
) -> DocumentPermissionsResponse:
    """Get all permissions for a document."""
    log_info(logger, "get_permissions called", document_id=document_id)
    # Get QDrive
    qdrive = await QDrive.find_one(QDrive.id == document_id)
    if not qdrive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    user_permissions: list[DocumentPermissionSchema] = []
    division_permissions: list[DivisionPermissionSchema] = []
    for permission in qdrive.permissions:
        resolved = await permission.resolve_fk()
        if resolved["user"]:
            user_permissions.append(
                DocumentPermissionSchema(
                    user_id=resolved["user"]["id"],
                    user_name=resolved["user"]["name"],
                    user_email=resolved["user"]["email"],
                    permission=resolved["permission"],
                )
            )
        elif resolved["division"]:
            division_permissions.append(
                DivisionPermissionSchema(
                    division=resolved["division"]["id"],
                    permission=resolved["permission"],
                )
            )

    return DocumentPermissionsResponse(
        user_permissions=user_permissions, division_permissions=division_permissions
    )


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

    # Get QDrive
    qdrive = await QDrive.find_one(QDrive.id == document_id)
    if not qdrive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Check if user is admin or owner or editor or in-a-division-of-editor
    is_user_admin = _is_admin(user)
    is_user_owner = user.id == qdrive.creator_id
    is_user_editor = user.id in [
        permission.user_id for permission in qdrive.permissions if permission.permission == "editor"
    ]
    is_user_in_division_of_editor = user.division in [
        permission.division_id
        for permission in qdrive.permissions
        if permission.permission == "editor"
    ]

    if not (is_user_admin or is_user_owner or is_user_editor or is_user_in_division_of_editor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only document owners, editors, and admins can manage permissions",
        )

    # Add user permission
    qdrive.permissions.append(
        QDrivePermission(
            user_id=payload.user_id,
            permission=payload.permission,
        )
    )
    await qdrive.save()

    return MessageResponse(message="User permission added successfully.")


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

    # Get QDrive
    qdrive = await QDrive.find_one(QDrive.id == document_id)
    if not qdrive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Check if user is admin or owner or editor or in-a-division-of-editor
    is_user_admin = _is_admin(user)
    is_user_owner = user.id == qdrive.creator_id
    is_user_editor = user.id in [
        permission.user_id for permission in qdrive.permissions if permission.permission == "editor"
    ]
    is_user_in_division_of_editor = user.division in [
        permission.division_id
        for permission in qdrive.permissions
        if permission.permission == "editor"
    ]

    if not (is_user_admin or is_user_owner or is_user_editor or is_user_in_division_of_editor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only document owners, editors, and admins can manage permissions",
        )

    # Add division permission
    qdrive.permissions.append(
        QDrivePermission(
            division_id=payload.division,
            permission=payload.permission,
        )
    )
    await qdrive.save()

    return MessageResponse(message="Division permission added successfully.")


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

    # Get QDrive
    qdrive = await QDrive.find_one(QDrive.id == document_id)
    if not qdrive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Check if user is admin or owner or editor or in-a-division-of-editor
    is_user_admin = _is_admin(user)
    is_user_owner = user.id == qdrive.creator_id
    is_user_editor = user.id in [
        permission.user_id for permission in qdrive.permissions if permission.permission == "editor"
    ]
    is_user_in_division_of_editor = user.division in [
        permission.division_id
        for permission in qdrive.permissions
        if permission.permission == "editor"
    ]

    if not (is_user_admin or is_user_owner or is_user_editor or is_user_in_division_of_editor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only document owners and editors can manage permissions",
        )

    # Remove user permission
    qdrive.permissions = [
        permission for permission in qdrive.permissions if permission.user_id != user_id
    ]
    await qdrive.save()

    return MessageResponse(message="User permission removed successfully.")


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

    # Get QDrive
    qdrive = await QDrive.find_one(QDrive.id == document_id)
    if not qdrive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Check if user is admin or owner or editor or in-a-division-of-editor
    is_user_admin = _is_admin(user)
    is_user_owner = user.id == qdrive.creator_id
    is_user_editor = user.id in [
        permission.user_id for permission in qdrive.permissions if permission.permission == "editor"
    ]
    is_user_in_division_of_editor = user.division in [
        permission.division_id
        for permission in qdrive.permissions
        if permission.permission == "editor"
    ]

    if not (is_user_admin or is_user_owner or is_user_editor or is_user_in_division_of_editor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only document owners, editors, and admins can manage permissions",
        )

    # Remove division permission
    qdrive.permissions = [
        permission for permission in qdrive.permissions if permission.division_id != division
    ]
    await qdrive.save()

    return MessageResponse(message="Division permission removed successfully.")

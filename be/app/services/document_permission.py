"""Document permission service."""

from __future__ import annotations

from typing import Literal, Optional

from app.models.document import DocumentItem, DocumentPermission, DivisionPermission
from app.models.user import User
from app.services.document import DocumentNotFoundError, get_document_by_id

PermissionLevel = Literal["viewer", "editor"]


class DocumentPermissionError(Exception):
    """Raised when user doesn't have permission to access a document."""

    pass


# ---------- internal helpers ----------


def _has_required_permission(user_permission: str, required_permission: str) -> bool:
    """Check if user permission meets required permission level."""
    if required_permission == "viewer":
        return user_permission in ["viewer", "editor"]
    elif required_permission == "editor":
        return user_permission == "editor"
    return False


def _get_user_permission(document: DocumentItem, user_id: str) -> Optional[str]:
    """Get individual user permission from document."""
    for perm in document.user_permissions:
        if perm.user_id == user_id:
            return perm.permission
    return None


def _get_division_permission(document: DocumentItem, division: Optional[str]) -> Optional[str]:
    """Get division permission from document."""
    if not division:
        return None
    for perm in document.division_permissions:
        if perm.division == division:
            return perm.permission
    return None


async def _has_direct_access(document: DocumentItem, user: User, required: PermissionLevel) -> bool:
    # Owner has full access
    if document.owned_by.id == user.employee_id:
        return True

    # Individual user permission
    up = _get_user_permission(document, user.employee_id)
    if up and _has_required_permission(up, required):
        return True

    # Division permission
    dp = _get_division_permission(document, user.division)
    if dp and _has_required_permission(dp, required):
        return True

    return False


# ---------- public API ----------


async def has_direct_document_access(
    document_id: str,
    user_id: str,
    required_permission: PermissionLevel = "viewer",
) -> bool:
    """Return True jika user punya akses *langsung* (owner/user/division) pada dokumen itu."""
    try:
        document = await get_document_by_id(document_id)
        user = await User.find_one(User.employee_id == user_id)
        if not user or not user.is_active:
            return False
        return await _has_direct_access(document, user, required_permission)
    except DocumentNotFoundError:
        return False


async def has_ancestor_folder_access(
    document_id: str,
    user_id: str,
    required_permission: PermissionLevel = "viewer",
) -> bool:
    """Return True jika user mendapatkan akses dari *ancestor folder* mana pun (inheritance)."""
    try:
        document = await get_document_by_id(document_id)
        user = await User.find_one(User.employee_id == user_id)
        if not user or not user.is_active:
            return False

        walker = document
        while walker.parent_id:
            parent = await DocumentItem.find_one(
                DocumentItem.document_id == walker.parent_id,
                {"is_deleted": False},
            )
            if parent is None:
                break
            if parent.type == "folder" and await _has_direct_access(
                parent, user, required_permission
            ):
                return True
            walker = parent
        return False
    except DocumentNotFoundError:
        return False


async def check_document_access(
    document_id: str,
    user_id: str,
    required_permission: PermissionLevel = "viewer",
) -> bool:
    """
    Access is granted if:
      - user has *direct* required_permission on the document, OR
      - user has *direct* required_permission on ANY *ancestor folder* of the document.
    """
    if await has_direct_document_access(document_id, user_id, required_permission):
        return True
    if await has_ancestor_folder_access(document_id, user_id, required_permission):
        return True
    return False


async def get_user_document_permission(document_id: str, user_id: str) -> str | None:
    """
    Get the highest *direct* permission level a user has for a document.
    Returns: "editor", "viewer", or None if no direct access.
    (Note: This does NOT compute inherited permission level, only direct.)
    """
    try:
        document = await get_document_by_id(document_id)
        user = await User.find_one(User.employee_id == user_id)

        if not user or not user.is_active:
            return None

        # Owner always has editor access
        if document.owned_by.id == user_id:
            return "editor"

        # Check individual user permissions first (higher priority)
        user_permission = _get_user_permission(document, user_id)
        if user_permission:
            return user_permission

        # Check division permissions
        division_permission = _get_division_permission(document, user.division)
        if division_permission:
            return division_permission

        return None

    except DocumentNotFoundError:
        return None


async def add_user_permission(
    document_id: str,
    user_id: str,
    user_name: str,
    user_email: str,
    permission: Literal["viewer", "editor"],
) -> None:
    """Add or update individual user permission for a document."""
    document = await get_document_by_id(document_id)

    # Remove existing permission for this user
    document.user_permissions = [
        perm for perm in document.user_permissions if perm.user_id != user_id
    ]

    # Add new permission
    document.user_permissions.append(
        DocumentPermission(
            user_id=user_id,
            user_name=user_name,
            user_email=user_email,
            permission=permission,
        )
    )

    await document.touch()


async def add_division_permission(
    document_id: str, division: str, permission: Literal["viewer", "editor"]
) -> None:
    """Add or update division permission for a document."""
    document = await get_document_by_id(document_id)

    # Remove existing permission for this division
    document.division_permissions = [
        perm for perm in document.division_permissions if perm.division != division
    ]

    # Add new permission
    document.division_permissions.append(
        DivisionPermission(division=division, permission=permission)
    )

    await document.touch()


async def remove_user_permission(document_id: str, user_id: str) -> None:
    """Remove individual user permission from a document."""
    document = await get_document_by_id(document_id)

    document.user_permissions = [
        perm for perm in document.user_permissions if perm.user_id != user_id
    ]

    await document.touch()


async def remove_division_permission(document_id: str, division: str) -> None:
    """Remove division permission from a document."""
    document = await get_document_by_id(document_id)

    document.division_permissions = [
        perm for perm in document.division_permissions if perm.division != division
    ]

    await document.touch()


async def get_document_permissions(document_id: str) -> dict[str, any]:
    """Get all permissions for a document."""
    document = await get_document_by_id(document_id)

    return {
        "user_permissions": [perm.model_dump() for perm in document.user_permissions],
        "division_permissions": [perm.model_dump() for perm in document.division_permissions],
    }


# app/services/document_permission.py


async def has_direct_document_access(
    document_id: str, user_id: str, required_permission: str = "viewer"
) -> bool:
    """
    True kalau user punya akses langsung (owner / user permission / division permission).
    Tidak cek folder ancestor.
    """
    try:
        document = await get_document_by_id(document_id)
        user = await User.find_one(User.employee_id == user_id)
        if not user or not user.is_active:
            return False

        # Owner langsung
        if document.owned_by.id == user_id:
            return True

        # User permission
        user_permission = _get_user_permission(document, user_id)
        if user_permission and _has_required_permission(user_permission, required_permission):
            return True

        # Division permission
        division_permission = _get_division_permission(document, user.division)
        if division_permission and _has_required_permission(
            division_permission, required_permission
        ):
            return True

        return False
    except DocumentNotFoundError:
        return False


async def has_ancestor_folder_access(
    document_id: str, user_id: str, required_permission: str = "viewer"
) -> bool:
    """
    True kalau user mendapat akses karena salah satu folder ancestor dishare.
    """
    try:
        current = await get_document_by_id(document_id)
    except DocumentNotFoundError:
        return False

    while current.parent_id:
        try:
            parent = await get_document_by_id(current.parent_id)
        except DocumentNotFoundError:
            break

        if parent.type == "folder":
            if await has_direct_document_access(parent.document_id, user_id, required_permission):
                return True
        current = parent

    return False

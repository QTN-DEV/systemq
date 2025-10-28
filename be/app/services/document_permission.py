"""Document permission service."""

from __future__ import annotations

import logging
from typing import Any, Literal, Optional

from beanie import PydanticObjectId

from app.logging_utils import get_logger, log_debug, log_info, log_warning
from app.models.document import DocumentItem, DocumentPermission, DivisionPermission
from app.models.user import User
from app.services.document import DocumentNotFoundError, get_document_by_id

PermissionLevel = Literal["viewer", "editor"]


class DocumentPermissionError(Exception):
    """Raised when user doesn't have permission to access a document."""

    pass


logger = get_logger(__name__)
ADMIN_LEVELS = {"admin", "administrator", "superadmin", "principal"}


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


async def _resolve_user(identifier: str) -> User | None:
    """Resolve User by employee_id or document id."""
    if not identifier:
        return None
    user = await User.find_one(User.employee_id == identifier)
    if user:
        return user
    try:
        oid = PydanticObjectId(identifier)
    except Exception:
        oid = None
    if oid:
        user = await User.get(oid)
        if user:
            return user
    return None


def _is_admin(user: User | None) -> bool:
    """Return True if user should be treated as a global admin."""
    if not user:
        return False
    
    # Check position field for "Admin"
    position = (user.position or "").strip()
    if position == "Admin":
        log_info(logger, "granting admin override (position)", user_id=user.employee_id, position=position)
        return True
    
    # Also check level field for backward compatibility
    level = (user.level or "").strip().lower()
    log_debug(logger, "checking admin override", user_id=user.employee_id, level=level)
    is_admin = level in ADMIN_LEVELS
    if is_admin:
        log_info(logger, "granting admin override (level)", user_id=user.employee_id, level=level)
    return is_admin


async def _has_direct_access(document: DocumentItem, user: User, required: PermissionLevel) -> bool:
    # Owner has full access
    if document.owned_by.id == user.employee_id:
        return True

    if _is_admin(user):
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


async def _has_inherited_access(document: DocumentItem, user: User, required: PermissionLevel) -> bool:
    if _is_admin(user):
        return True

    walker = document
    while walker.parent_id:
        parent = await DocumentItem.find_one(
            DocumentItem.document_id == walker.parent_id,
            {"is_deleted": False},
        )
        if parent is None:
            break
        if parent.type == "folder" and await _has_direct_access(parent, user, required):
            return True
        walker = parent
    return False


# ---------- public API ----------


async def has_direct_document_access(
    document_id: str,
    user_id: str,
    required_permission: PermissionLevel = "viewer",
) -> bool:
    """Return True jika user punya akses *langsung* (owner/user/division) pada dokumen itu."""
    log_debug(
        logger,
        "checking direct document access",
        document_id=document_id,
        user_id=user_id,
        required_permission=required_permission,
    )
    try:
        document = await get_document_by_id(document_id)
        user = await _resolve_user(user_id)
        if not user or not user.is_active:
            log_warning(logger, "access denied: user not found or inactive", user_id=user_id, document_id=document_id)
            return False
        if _is_admin(user):
            return True
        return await _has_direct_access(document, user, required_permission)
    except DocumentNotFoundError:
        log_warning(logger, "direct access check failed: document not found", document_id=document_id, user_id=user_id)
        return False


async def has_ancestor_folder_access(
    document_id: str,
    user_id: str,
    required_permission: PermissionLevel = "viewer",
) -> bool:
    """Return True jika user mendapatkan akses dari *ancestor folder* mana pun (inheritance)."""
    log_debug(
        logger,
        "checking inherited document access",
        document_id=document_id,
        user_id=user_id,
        required_permission=required_permission,
    )
    try:
        document = await get_document_by_id(document_id)
        user = await _resolve_user(user_id)
        if not user or not user.is_active:
            log_warning(logger, "ancestor access denied: user not found or inactive", user_id=user_id, document_id=document_id)
            return False

        return await _has_inherited_access(document, user, required_permission)
    except DocumentNotFoundError:
        log_warning(logger, "inherited access check failed: document not found", document_id=document_id, user_id=user_id)
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
    log_debug(
        logger,
        "aggregated access check",
        document_id=document_id,
        user_id=user_id,
        required_permission=required_permission,
    )
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


async def get_document_permissions(document_id: str) -> dict[str, Any]:
    """Get all permissions for a document."""
    document = await get_document_by_id(document_id)

    return {
        "user_permissions": [perm.model_dump() for perm in document.user_permissions],
        "division_permissions": [perm.model_dump() for perm in document.division_permissions],
    }


async def get_document_access_summary(document_id: str, user_id: str) -> dict[str, Any]:
    """Compute effective can_view/can_edit flags along with detail breakdown."""
    detail = {
        "viewer": {"direct": False, "inherited": False},
        "editor": {"direct": False, "inherited": False},
    }

    try:
        document = await get_document_by_id(document_id)
    except DocumentNotFoundError:
        log_warning(logger, "access summary failed: document not found", document_id=document_id, user_id=user_id)
        raise

    user = await _resolve_user(user_id)
    if not user or not user.is_active:
        log_warning(logger, "access summary: user not found or inactive", document_id=document_id, user_id=user_id)
        return {"can_view": False, "can_edit": False, "detail": detail}

    if _is_admin(user):
        detail["viewer"]["direct"] = True
        detail["editor"]["direct"] = True
        summary = {"can_view": True, "can_edit": True, "detail": detail}
        log_info(logger, "access summary resolved (admin)", document_id=document_id, user_id=user.employee_id, summary=summary)
        return summary

    view_direct = await _has_direct_access(document, user, "viewer")
    view_inherited = await _has_inherited_access(document, user, "viewer")
    detail["viewer"]["direct"] = view_direct
    detail["viewer"]["inherited"] = view_inherited

    edit_direct = await _has_direct_access(document, user, "editor")
    edit_inherited = await _has_inherited_access(document, user, "editor")
    detail["editor"]["direct"] = edit_direct
    detail["editor"]["inherited"] = edit_inherited

    summary = {
        "can_view": view_direct or view_inherited,
        "can_edit": edit_direct or edit_inherited,
        "detail": detail,
    }
    log_debug(
        logger,
        "access summary resolved",
        document_id=document_id,
        user_id=user.employee_id,
        can_view=summary["can_view"],
        can_edit=summary["can_edit"],
        detail=detail,
    )
    return summary


async def can_user_view_document(document_id: str, user_id: str) -> bool:
    return await check_document_access(document_id, user_id, "viewer")


async def can_user_edit_document(document_id: str, user_id: str) -> bool:
    return await check_document_access(document_id, user_id, "editor")

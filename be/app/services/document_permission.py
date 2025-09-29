"""Document permission service."""

from __future__ import annotations

from typing import Literal

from app.models.document import DocumentItem, DocumentPermission, DivisionPermission
from app.models.user import User
from app.services.document import DocumentNotFoundError, get_document_by_id


class DocumentPermissionError(Exception):
    """Raised when user doesn't have permission to access a document."""
    pass


async def check_document_access(
    document_id: str, 
    user_id: str, 
    required_permission: Literal["viewer", "editor"] = "viewer"
) -> bool:
    """
    Check if user has required permission to access a document.
    
    Args:
        document_id: ID of the document to check
        user_id: ID of the user requesting access
        required_permission: Minimum permission level required ("viewer" or "editor")
    
    Returns:
        True if user has required permission, False otherwise
    """
    try:
        document = await get_document_by_id(document_id)
        user = await User.find_one(User.employee_id == user_id)
        
        if not user or not user.is_active:
            return False
            
        # Owner always has full access
        if document.owned_by.id == user_id:
            return True
            
        # Check individual user permissions
        user_permission = _get_user_permission(document, user_id)
        if user_permission:
            return _has_required_permission(user_permission, required_permission)
            
        # Check division permissions
        division_permission = _get_division_permission(document, user.division)
        if division_permission:
            return _has_required_permission(division_permission, required_permission)
            
        # No permissions found
        return False
        
    except DocumentNotFoundError:
        return False


async def get_user_document_permission(document_id: str, user_id: str) -> str | None:
    """
    Get the highest permission level a user has for a document.
    
    Returns:
        "editor", "viewer", or None if no access
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


def _get_user_permission(document: DocumentItem, user_id: str) -> str | None:
    """Get individual user permission from document."""
    for perm in document.user_permissions:
        if perm.user_id == user_id:
            return perm.permission
    return None


def _get_division_permission(document: DocumentItem, division: str | None) -> str | None:
    """Get division permission from document."""
    if not division:
        return None
        
    for perm in document.division_permissions:
        if perm.division == division:
            return perm.permission
    return None


def _has_required_permission(user_permission: str, required_permission: str) -> bool:
    """Check if user permission meets required permission level."""
    if required_permission == "viewer":
        return user_permission in ["viewer", "editor"]
    elif required_permission == "editor":
        return user_permission == "editor"
    return False


async def add_user_permission(
    document_id: str, 
    user_id: str, 
    user_name: str, 
    user_email: str, 
    permission: Literal["viewer", "editor"]
) -> None:
    """Add or update individual user permission for a document."""
    document = await get_document_by_id(document_id)
    
    # Remove existing permission for this user
    document.user_permissions = [
        perm for perm in document.user_permissions 
        if perm.user_id != user_id
    ]
    
    # Add new permission
    document.user_permissions.append(DocumentPermission(
        user_id=user_id,
        user_name=user_name,
        user_email=user_email,
        permission=permission
    ))
    
    await document.touch()


async def add_division_permission(
    document_id: str, 
    division: str, 
    permission: Literal["viewer", "editor"]
) -> None:
    """Add or update division permission for a document."""
    document = await get_document_by_id(document_id)
    
    # Remove existing permission for this division
    document.division_permissions = [
        perm for perm in document.division_permissions 
        if perm.division != division
    ]
    
    # Add new permission
    document.division_permissions.append(DivisionPermission(
        division=division,
        permission=permission
    ))
    
    await document.touch()


async def remove_user_permission(document_id: str, user_id: str) -> None:
    """Remove individual user permission from a document."""
    document = await get_document_by_id(document_id)
    
    document.user_permissions = [
        perm for perm in document.user_permissions 
        if perm.user_id != user_id
    ]
    
    await document.touch()


async def remove_division_permission(document_id: str, division: str) -> None:
    """Remove division permission from a document."""
    document = await get_document_by_id(document_id)
    
    document.division_permissions = [
        perm for perm in document.division_permissions 
        if perm.division != division
    ]
    
    await document.touch()


async def get_document_permissions(document_id: str) -> dict[str, any]:
    """Get all permissions for a document."""
    document = await get_document_by_id(document_id)
    
    return {
        "user_permissions": [perm.model_dump() for perm in document.user_permissions],
        "division_permissions": [perm.model_dump() for perm in document.division_permissions]
    }


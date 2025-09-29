"""Document permission schema definitions."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel


class DocumentPermissionSchema(BaseModel):
    """Individual user permission schema."""
    user_id: str
    user_name: str
    user_email: str
    permission: Literal["viewer", "editor"]


class DivisionPermissionSchema(BaseModel):
    """Division permission schema."""
    division: str
    permission: Literal["viewer", "editor"]


class DocumentPermissionsResponse(BaseModel):
    """Response schema for document permissions."""
    user_permissions: list[DocumentPermissionSchema]
    division_permissions: list[DivisionPermissionSchema]


class AddUserPermissionRequest(BaseModel):
    """Request schema for adding user permission."""
    user_id: str
    user_name: str
    user_email: str
    permission: Literal["viewer", "editor"]


class AddDivisionPermissionRequest(BaseModel):
    """Request schema for adding division permission."""
    division: str
    permission: Literal["viewer", "editor"]


class UpdatePermissionRequest(BaseModel):
    """Request schema for updating permission."""
    permission: Literal["viewer", "editor"]


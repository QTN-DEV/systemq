from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.core import ResponseEnvelope

from .dependencies import UseAuthContext
from .schemas import AuthUserProfile

router = APIRouter()


@router.get(
    "/me",
    response_model=ResponseEnvelope[AuthUserProfile],
    summary="Get current user profile (v2)",
    operation_id="getMyProfile",
)
async def get_my_profile(context: UseAuthContext) -> ResponseEnvelope[AuthUserProfile]:
    user = context.user
    return ResponseEnvelope(
        success=True,
        result=AuthUserProfile(
            id=user.id,
            name=user.name,
            email=user.email,
            permissions=list(user.permissions),
            employee_id=user.employee_id,
        ),
    )

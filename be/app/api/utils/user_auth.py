"""User authentication utilities."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.schemas import UserProfile
from app.services import auth
from app.services.auth import AuthenticationError, UserNotFoundError


async def resolve_user_from_token(authorization: str) -> UserProfile:
    """Resolve user from authorization header."""
    token = auth.parse_bearer_token(authorization)
    try:
        user_data = await auth.get_user_profile_from_token(token=token)
    except (AuthenticationError, UserNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    return UserProfile.model_validate(user_data)

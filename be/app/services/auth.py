"""Authentication service."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from typing import Any

from app.core.security import (
    ResetToken,
    generate_reset_token,
    generate_session_token,
    hash_password,
    verify_password,
)
from app.models import PasswordResetToken, SessionToken, User
from app.services.email import EmailConfigurationError, send_email
from constants import APP_NAME

DEFAULT_ADMIN_EMAIL = "admin@quantumteknologi.com"


class AuthenticationError(ValueError):
    pass


class PasswordResetError(ValueError):
    pass


class UserNotFoundError(LookupError):
    pass


def _serialize_user(user: User) -> dict[str, Any]:
    return {
        "id": user.employee_id or str(user.id),
        "name": user.name,
        "email": user.email,
        "title": user.title,
        "division": user.division,
        "level": user.level,
        "position": user.position,
        "subordinates": user.subordinates,
        "projects": user.projects,
        "avatar": user.avatar,
        "employment_type": user.employment_type,
    }


async def ensure_default_admin() -> None:
    normalized_email = DEFAULT_ADMIN_EMAIL.lower()
    existing = await User.find_one(User.email == normalized_email)
    if existing:
        return

    admin_user = User(
        employee_id="ADMIN-001",
        name="Administrator",
        email=normalized_email,
        title="System Administrator",
        division="Administration",
        level="Admin",
        position="Internal Ops",
        hashed_password=hash_password("admin"),
        subordinates=[],
        projects=[],
        avatar=None,
        employment_type="full-time",
        is_active=True,
    )
    await admin_user.insert()


async def authenticate_user(email: str, password: str) -> User:
    normalized_email = email.strip().lower()
    user = await User.find_one(User.email == normalized_email)
    if user is None or not user.is_active:
        raise AuthenticationError("Invalid email or password")
    if not verify_password(password, user.hashed_password):
        raise AuthenticationError("Invalid email or password")
    return user


async def login(email: str, password: str) -> dict[str, Any]:
    user = await authenticate_user(email, password)
    token, expires_at = generate_session_token(user_identifier=str(user.id))
    await _persist_session_token(user, token, expires_at)
    return {
        "token": token,
        "expires_at": expires_at,
        "user": _serialize_user(user),
    }


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def _persist_session_token(user: User, token: str, expires_at: int) -> SessionToken:
    expires_at_dt = datetime.fromtimestamp(expires_at / 1000, tz=UTC)
    session = SessionToken(
        user_id=user.id,
        token_hash=_hash_token(token),
        expires_at=expires_at_dt,
    )
    await session.insert()
    return session


async def _load_session(token: str) -> SessionToken | None:
    token_hash = _hash_token(token)
    return await SessionToken.find_one(SessionToken.token_hash == token_hash)


async def _resolve_session(token: str) -> tuple[SessionToken, User]:
    session = await _load_session(token)
    if session is None or session.revoked or session.is_expired:
        raise AuthenticationError("Invalid or expired session token")

    user = await User.get(session.user_id)
    if user is None:
        raise UserNotFoundError("User associated with the token no longer exists")
    if not user.is_active:
        raise AuthenticationError("Invalid or expired session token")
    return session, user


async def _store_reset_token(email: str, token: ResetToken) -> PasswordResetToken:
    expires_at = datetime.fromtimestamp(token.expires_at / 1000, tz=UTC)
    reset_document = PasswordResetToken(
        email=email,
        token=token.token,
        expires_at=expires_at,
        used=False,
    )
    await reset_document.insert()
    return reset_document


async def send_password_reset_email(email: str, token: ResetToken) -> None:
    reset_link = f"https://example.com/reset-password?token={token.token}"
    subject = f"{APP_NAME} password reset"
    body = (
        "You requested a password reset."
        f"\n\nToken: {token.token}"
        f"\nReset link: {reset_link}"
        "\n\nIf you did not request this, you can ignore this message."
    )
    await send_email(subject=subject, recipient=email, body=body)


async def forgot_password(email: str) -> None:
    normalized_email = email.strip().lower()
    user = await User.find_one(User.email == normalized_email)
    if user is None:
        return
    token = generate_reset_token()
    reset_document = await _store_reset_token(normalized_email, token)
    try:
        await send_password_reset_email(normalized_email, token)
    except EmailConfigurationError:
        await reset_document.delete()
        raise


async def reset_password(token_value: str, new_password: str) -> None:
    token_document = await PasswordResetToken.find_one(
        PasswordResetToken.token == token_value,
    )
    if token_document is None or token_document.used or token_document.is_expired:
        raise PasswordResetError("Invalid or expired reset token")

    user = await User.find_one(User.email == token_document.email)
    if user is None:
        raise PasswordResetError("Associated user account not found")

    user.hashed_password = hash_password(new_password)
    await user.touch()

    token_document.used = True
    await token_document.save()


async def change_password(identifier: str, current_password: str, new_password: str) -> None:
    normalized_identifier = identifier.strip()
    user = await User.find_one(User.employee_id == normalized_identifier)
    if user is None:
        user = await User.find_one(User.email == normalized_identifier.lower())
    if user is None:
        raise AuthenticationError("User not found")

    if not verify_password(current_password, user.hashed_password):
        raise AuthenticationError("Invalid current password")

    user.hashed_password = hash_password(new_password)
    await user.touch()


def serialize_user(user: User) -> dict[str, Any]:
    """Public helper for routers."""
    return _serialize_user(user)


def parse_bearer_token(authorization_header: str | None) -> str:
    if not authorization_header:
        raise AuthenticationError("Authorization header missing")
    scheme, _, value = authorization_header.partition(" ")
    if scheme.lower() != "bearer" or not value:
        raise AuthenticationError("Invalid authorization header format")
    token = value.strip()
    if not token:
        raise AuthenticationError("Invalid authorization header format")
    return token


async def renew_session(token: str) -> dict[str, Any]:
    session, user = await _resolve_session(token)
    await session.revoke()

    new_token, expires_at = generate_session_token(user_identifier=str(user.id))
    await _persist_session_token(user, new_token, expires_at)
    return {
        "token": new_token,
        "expires_at": expires_at,
        "user": _serialize_user(user),
    }


async def get_user_profile_from_token(token: str) -> dict[str, Any]:
    _, user = await _resolve_session(token)
    return _serialize_user(user)


async def logout(token: str) -> None:
    session = await _load_session(token)
    if session is None or session.revoked or session.is_expired:
        raise AuthenticationError("Invalid or expired session token")

    await session.revoke()

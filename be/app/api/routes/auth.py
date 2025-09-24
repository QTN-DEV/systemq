"""Authentication routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Response, status

from app.schemas.auth import (
    AuthSession,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RenewSessionRequest,
    ResetPasswordRequest,
    UserProfile,
)
from app.services import auth as auth_service
from app.services.auth import (
    AuthenticationError,
    PasswordResetError,
    UserNotFoundError,
)
from app.services.email import EmailConfigurationError

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=AuthSession,
    summary="Authenticate with email and password",
    response_description="Session token with the authenticated user's profile.",
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "description": "Invalid credentials or the account is inactive.",
        },
    },
)
async def login(payload: LoginRequest) -> AuthSession:
    """Validate credentials and issue a short-lived session token."""
    try:
        result = await auth_service.login(
            email=payload.email,
            password=payload.password,
        )
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    return AuthSession.model_validate(result)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Send password reset instructions",
    response_description="Acknowledgement that a reset email was dispatched.",
    responses={
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "SMTP configuration error prevented email delivery.",
        },
    },
)
async def forgot_password(payload: ForgotPasswordRequest) -> MessageResponse:
    """Queue a password reset token and dispatch the notification email."""
    try:
        await auth_service.forgot_password(email=payload.email)
    except (AuthenticationError, EmailConfigurationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    return MessageResponse(message="Password reset request processed.")


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset a password using a token",
    response_description="Confirmation that the password reset succeeded.",
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "description": "Token is invalid, expired, or already used.",
        },
    },
)
async def reset_password(payload: ResetPasswordRequest) -> MessageResponse:
    """Validate the reset token and set a new password for the account."""
    try:
        await auth_service.reset_password(
            token_value=payload.token,
            new_password=payload.new_password,
        )
    except PasswordResetError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return MessageResponse(message="Password changed successfully.")


async def change_password(payload: ChangePasswordRequest) -> MessageResponse:
    """Update a user's password after verifying the supplied current password."""
    try:
        await auth_service.change_password(
            identifier=payload.user_id,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return MessageResponse(message="Password changed successfully.")


@router.post(
    "/renew",
    response_model=AuthSession,
    summary="Renew an existing session token",
    response_description="New session token and updated user payload.",
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "description": "Token is invalid or expired beyond the renewal window.",
        },
    },
)
async def renew_session(payload: RenewSessionRequest) -> AuthSession:
    """Exchange a valid session token for a fresh one."""
    try:
        result = await auth_service.renew_session(token=payload.token)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    return AuthSession.model_validate(result)


async def get_current_user(authorization: Annotated[str | None, Header()]) -> UserProfile:
    """Resolve the user profile associated with the supplied bearer token."""
    token = auth_service.parse_bearer_token(authorization)
    try:
        user_data = await auth_service.get_user_profile_from_token(token=token)
    except (AuthenticationError, UserNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    return UserProfile.model_validate(user_data)


async def logout(authorization: Annotated[str | None, Header()]) -> Response:
    """Invalidate the supplied bearer token so it can no longer be used."""
    token = auth_service.parse_bearer_token(authorization)
    try:
        await auth_service.logout(token=token)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)

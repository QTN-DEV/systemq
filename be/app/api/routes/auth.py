from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas.auth import (
    AuthSession,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
)
from app.services import auth as auth_service
from app.services.auth import AuthenticationError, PasswordResetError
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
        }
    },
)
async def login(payload: LoginRequest) -> AuthSession:
    """Validate credentials and issue a short-lived session token."""

    try:
        session_payload = await auth_service.login(payload.email, payload.password)
    except AuthenticationError as exc:  # pragma: no cover - handled by FastAPI
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return AuthSession.model_validate(session_payload)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Send password reset instructions",
    response_description="Acknowledgement that a reset email was dispatched.",
    responses={
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "SMTP configuration error prevented email delivery.",
        }
    },
)
async def forgot_password(payload: ForgotPasswordRequest) -> MessageResponse:
    """Queue a password reset token and dispatch the notification email."""

    try:
        await auth_service.forgot_password(payload.email)
    except EmailConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    return MessageResponse(
        message="If the account exists, password reset instructions have been sent.",
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset a password using a token",
    response_description="Confirmation that the password reset succeeded.",
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "description": "Token is invalid, expired, or already used.",
        }
    },
)
async def reset_password(payload: ResetPasswordRequest) -> MessageResponse:
    """Validate the reset token and set a new password for the account."""

    try:
        await auth_service.reset_password(payload.token, payload.new_password)
    except PasswordResetError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageResponse(message="Password has been reset successfully.")


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password for an authenticated user",
    response_description="Confirmation that the password update completed.",
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "description": "User not found or current password does not match.",
        }
    },
)
async def change_password(payload: ChangePasswordRequest) -> MessageResponse:
    """Update a user's password after verifying the supplied current password."""

    try:
        await auth_service.change_password(
            payload.user_id,
            payload.current_password,
            payload.new_password,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageResponse(message="Password updated successfully.")

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


@router.post("/login", response_model=AuthSession)
async def login(payload: LoginRequest) -> AuthSession:
    try:
        session_payload = await auth_service.login(payload.email, payload.password)
    except AuthenticationError as exc:  # pragma: no cover - covered by FastAPI
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return AuthSession.model_validate(session_payload)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def forgot_password(payload: ForgotPasswordRequest) -> MessageResponse:
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


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(payload: ResetPasswordRequest) -> MessageResponse:
    try:
        await auth_service.reset_password(payload.token, payload.new_password)
    except PasswordResetError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageResponse(message="Password has been reset successfully.")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(payload: ChangePasswordRequest) -> MessageResponse:
    try:
        await auth_service.change_password(
            payload.user_id,
            payload.current_password,
            payload.new_password,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageResponse(message="Password updated successfully.")

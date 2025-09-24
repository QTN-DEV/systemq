"""Authentication schema definitions."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, HttpUrl

from app.models.enums import EmploymentTypeLiteral, PositionLiteral


class UserProfile(BaseModel):
    id: str
    name: str
    email: EmailStr
    title: str | None = None
    division: str | None = None
    level: str | None = None
    position: PositionLiteral | None = None
    subordinates: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    avatar: HttpUrl | None = None
    employment_type: EmploymentTypeLiteral = Field(default="full-time")


class AuthSession(BaseModel):
    token: str
    expires_at: int
    user: UserProfile


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    user_id: str
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str


class RenewSessionRequest(BaseModel):
    token: str = Field(min_length=1)

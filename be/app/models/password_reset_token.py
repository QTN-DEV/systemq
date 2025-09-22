from __future__ import annotations

from datetime import datetime, timezone

from beanie import Document
from pydantic import EmailStr, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PasswordResetToken(Document):
    email: EmailStr
    token: str
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "password_reset_tokens"
        indexes = ["email", "token"]

    @property
    def is_expired(self) -> bool:
        expiry = self.expires_at
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > expiry

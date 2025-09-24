"""Session token model definitions."""

from __future__ import annotations

from datetime import datetime, UTC

from beanie import Document, PydanticObjectId
from pydantic import Field


class SessionToken(Document):
    user_id: PydanticObjectId
    token_hash: str
    issued_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    expires_at: datetime
    revoked: bool = False

    class Settings:
        name = "session_tokens"
        indexes = ["token_hash", "user_id"]  # type: ignore[assignment]

    @property
    def is_expired(self) -> bool:
        expiry = self.expires_at
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=UTC)
        return datetime.now(UTC) > expiry

    async def revoke(self) -> None:
        if self.revoked:
            return
        self.revoked = True
        await self.save()

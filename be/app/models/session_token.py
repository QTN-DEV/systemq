from __future__ import annotations

from datetime import datetime, timezone

from beanie import Document, PydanticObjectId
from pydantic import Field


class SessionToken(Document):
    user_id: PydanticObjectId
    token_hash: str
    issued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    revoked: bool = False

    class Settings:
        name = "session_tokens"
        indexes = ["token_hash", "user_id"]

    @property
    def is_expired(self) -> bool:
        return self.expires_at <= datetime.now(timezone.utc)

    async def revoke(self) -> None:
        if self.revoked:
            return
        self.revoked = True
        await self.save()

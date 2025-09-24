"""Database initialization using Beanie ODM."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models import (
    DocumentHistory,
    DocumentItem,
    PasswordResetToken,
    Project,
    SessionToken,
    SystemStatus,
    User,
)
from constants import MONGODB_DATABASE, MONGODB_URI

_motor_client: AsyncIOMotorClient | None = None


async def init_database() -> None:
    global _motor_client

    if _motor_client is not None:
        return

    _motor_client = AsyncIOMotorClient(MONGODB_URI)
    await init_beanie(
        database=_motor_client[MONGODB_DATABASE],
        document_models=[
            SystemStatus,
            User,
            PasswordResetToken,
            Project,
            SessionToken,
            DocumentItem,
            DocumentHistory,
        ],
    )


async def ensure_default_data() -> None:
    from app.services.auth import ensure_default_admin

    await ensure_default_admin()


def get_motor_client() -> AsyncIOMotorClient | None:
    return _motor_client


async def close_database() -> None:
    global _motor_client

    if _motor_client is None:
        return

    _motor_client.close()
    _motor_client = None


@asynccontextmanager
async def lifespan_context(_: Any) -> AsyncIterator[None]:
    await init_database()
    await ensure_default_data()
    try:
        yield
    finally:
        await close_database()

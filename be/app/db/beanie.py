from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models import SystemStatus
from constants import MONGODB_DATABASE, MONGODB_URI

_motor_client: AsyncIOMotorClient | None = None


async def init_database() -> None:
    global _motor_client

    if _motor_client is not None:
        return

    _motor_client = AsyncIOMotorClient(MONGODB_URI)
    await init_beanie(database=_motor_client[MONGODB_DATABASE], document_models=[SystemStatus])


def get_motor_client() -> AsyncIOMotorClient | None:
    return _motor_client


async def close_database() -> None:
    global _motor_client

    if _motor_client is None:
        return

    _motor_client.close()
    _motor_client = None


@asynccontextmanager
async def lifespan_context() -> AsyncIterator[None]:
    await init_database()
    try:
        yield
    finally:
        await close_database()

"""Root routes."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get(
    "/",
    tags=["Health"],
    summary="Service health check",
    response_description="Heartbeat message confirming the API is running.",
)
async def read_root() -> dict[str, str]:
    """Return a static heartbeat payload to confirm service availability."""
    return {"message": "Hello, World!"}

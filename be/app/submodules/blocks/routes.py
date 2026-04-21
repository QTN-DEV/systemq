"""FastAPI routes for the blocks submodule."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.auth import get_current_user
from app.schemas.auth import UserProfile

from .repository import get_block_repo, get_comment_repo, get_history_repo
from .schemas import (
    BlockCreate,
    BlockHistoryResponse,
    BlockResponse,
    BlockUpdate,
    CommentCreate,
    CommentResponse,
)
from .service import BlockCycleError, BlockNotFoundError, BlockService

router = APIRouter(prefix="/blocks", tags=["Blocks"])


def _get_service(
    blocks=Depends(get_block_repo),
    comments=Depends(get_comment_repo),
    history=Depends(get_history_repo),
) -> BlockService:
    return BlockService(blocks=blocks, comments=comments, history=history)


# ── Block Endpoints ────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[BlockResponse],
    summary="List all blocks (flat)",
)
async def list_blocks(
    svc: BlockService = Depends(_get_service),
    _: UserProfile = Depends(get_current_user),
) -> list[BlockResponse]:
    blocks = await svc.get_all_flat()
    return [BlockResponse.model_validate(b) for b in blocks]


@router.get(
    "/tree",
    response_model=list[BlockResponse],
    summary="Get block tree (nested)",
)
async def get_block_tree(
    svc: BlockService = Depends(_get_service),
    _: UserProfile = Depends(get_current_user),
) -> list[BlockResponse]:
    roots = await svc.get_tree()
    return [BlockResponse.model_validate(r) for r in roots]


@router.get(
    "/{block_id}",
    response_model=BlockResponse,
    summary="Get a single block",
)
async def get_block(
    block_id: UUID,
    svc: BlockService = Depends(_get_service),
    _: UserProfile = Depends(get_current_user),
) -> BlockResponse:
    try:
        block = await svc.get_block(block_id)
    except BlockNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return BlockResponse.model_validate(block)


@router.get(
    "/{block_id}/ancestors",
    response_model=list[BlockResponse],
    summary="Get ancestor chain (root → parent)",
)
async def get_ancestors(
    block_id: UUID,
    svc: BlockService = Depends(_get_service),
    _: UserProfile = Depends(get_current_user),
) -> list[BlockResponse]:
    try:
        ancestors = await svc.get_ancestors(block_id)
    except BlockNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return [BlockResponse.model_validate(a) for a in ancestors]


@router.post(
    "/",
    response_model=BlockResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a block",
)
async def create_block(
    payload: BlockCreate,
    svc: BlockService = Depends(_get_service),
    user: UserProfile = Depends(get_current_user),
) -> BlockResponse:
    try:
        block = await svc.create_block(payload, created_by=user.id)
    except BlockNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return BlockResponse.model_validate(block)


@router.patch(
    "/{block_id}",
    response_model=BlockResponse,
    summary="Update a block",
)
async def update_block(
    block_id: UUID,
    payload: BlockUpdate,
    svc: BlockService = Depends(_get_service),
    user: UserProfile = Depends(get_current_user),
) -> BlockResponse:
    try:
        block = await svc.update_block(
            block_id,
            payload,
            actor_id=user.id,
            actor_name=user.name,
        )
    except BlockNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except BlockCycleError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return BlockResponse.model_validate(block)


@router.delete(
    "/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a block (cascades to all children)",
)
async def delete_block(
    block_id: UUID,
    svc: BlockService = Depends(_get_service),
    _: UserProfile = Depends(get_current_user),
) -> None:
    try:
        await svc.delete_block(block_id)
    except BlockNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


# ── Comment Endpoints ──────────────────────────────────────────────────────

@router.get(
    "/{block_id}/comments",
    response_model=list[CommentResponse],
    summary="List comments for a block",
)
async def list_comments(
    block_id: UUID,
    svc: BlockService = Depends(_get_service),
    _: UserProfile = Depends(get_current_user),
) -> list[CommentResponse]:
    try:
        comments = await svc.get_comments(block_id)
    except BlockNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return [CommentResponse.model_validate(c) for c in comments]


@router.post(
    "/{block_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a comment to a block",
)
async def add_comment(
    block_id: UUID,
    payload: CommentCreate,
    svc: BlockService = Depends(_get_service),
    user: UserProfile = Depends(get_current_user),
) -> CommentResponse:
    try:
        comment = await svc.add_comment(
            block_id,
            content=payload.content,
            author_id=user.id,
            author_name=user.name,
        )
    except BlockNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return CommentResponse.model_validate(comment)


# ── History Endpoints ──────────────────────────────────────────────────────

@router.get(
    "/{block_id}/history",
    response_model=list[BlockHistoryResponse],
    summary="Get audit history for a block",
)
async def get_history(
    block_id: UUID,
    svc: BlockService = Depends(_get_service),
    _: UserProfile = Depends(get_current_user),
) -> list[BlockHistoryResponse]:
    try:
        events = await svc.get_history(block_id)
    except BlockNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return [BlockHistoryResponse.model_validate(e) for e in events]

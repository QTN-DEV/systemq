"""Repository abstraction for the blocks submodule.

Swap the concrete implementation (BeanieBlockRepository → e.g. PostgreSQLBlockRepository)
without touching service or route code.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Protocol, runtime_checkable
from uuid import UUID

from .models import Block, BlockHistory, Comment


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ── Abstract Interfaces ────────────────────────────────────────────────────

@runtime_checkable
class BlockRepository(Protocol):
    async def get(self, block_id: UUID) -> Block | None: ...
    async def list_all(self) -> list[Block]: ...
    async def list_children(self, parent_id: UUID) -> list[Block]: ...
    async def create(self, block: Block) -> Block: ...
    async def save(self, block: Block) -> Block: ...
    async def delete(self, block_id: UUID) -> None: ...


@runtime_checkable
class CommentRepository(Protocol):
    async def list_by_block(self, block_id: UUID) -> list[Comment]: ...
    async def create(self, comment: Comment) -> Comment: ...
    async def delete_by_block(self, block_id: UUID) -> None: ...


@runtime_checkable
class HistoryRepository(Protocol):
    async def list_by_block(self, block_id: UUID) -> list[BlockHistory]: ...
    async def create(self, event: BlockHistory) -> BlockHistory: ...
    async def delete_by_block(self, block_id: UUID) -> None: ...


# ── Beanie / MongoDB Implementations ──────────────────────────────────────

class BeanieBlockRepository:
    async def get(self, block_id: UUID) -> Block | None:
        return await Block.get(block_id)

    async def list_all(self) -> list[Block]:
        return await Block.find_all().to_list()

    async def list_children(self, parent_id: UUID) -> list[Block]:
        return await Block.find(Block.parent_id == parent_id).to_list()

    async def create(self, block: Block) -> Block:
        await block.insert()
        return block

    async def save(self, block: Block) -> Block:
        block.updated_at = _utcnow()
        await block.save()
        return block

    async def delete(self, block_id: UUID) -> None:
        block = await Block.get(block_id)
        if block:
            await block.delete()


class BeanieCommentRepository:
    async def list_by_block(self, block_id: UUID) -> list[Comment]:
        return await Comment.find(Comment.block_id == block_id).sort(+Comment.created_at).to_list()

    async def create(self, comment: Comment) -> Comment:
        await comment.insert()
        return comment

    async def delete_by_block(self, block_id: UUID) -> None:
        await Comment.find(Comment.block_id == block_id).delete()


class BeanieHistoryRepository:
    async def list_by_block(self, block_id: UUID) -> list[BlockHistory]:
        return await BlockHistory.find(
            BlockHistory.block_id == block_id,
        ).sort(-BlockHistory.changed_at).to_list()

    async def create(self, event: BlockHistory) -> BlockHistory:
        await event.insert()
        return event

    async def delete_by_block(self, block_id: UUID) -> None:
        await BlockHistory.find(BlockHistory.block_id == block_id).delete()


# ── Dependency Providers (swap here to change DB) ─────────────────────────

def get_block_repo() -> BlockRepository:
    return BeanieBlockRepository()


def get_comment_repo() -> CommentRepository:
    return BeanieCommentRepository()


def get_history_repo() -> HistoryRepository:
    return BeanieHistoryRepository()

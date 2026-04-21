"""Business logic for the blocks submodule.

This layer has no direct knowledge of the database — all data access
is delegated to repository instances passed at construction time.
"""

from __future__ import annotations

from uuid import UUID, uuid4

from .enums import TRACKED_FIELDS
from .models import Block, BlockHistory, Comment
from .repository import BlockRepository, CommentRepository, HistoryRepository
from .schemas import BlockCreate, BlockUpdate


class BlockNotFoundError(ValueError):
    pass


class BlockCycleError(ValueError):
    pass


class BlockService:
    def __init__(
        self,
        blocks: BlockRepository,
        comments: CommentRepository,
        history: HistoryRepository,
    ) -> None:
        self._blocks = blocks
        self._comments = comments
        self._history = history

    # ── READ ──────────────────────────────────────────────────────────────

    async def get_all_flat(self) -> list[Block]:
        """Return every block as a flat list. Frontend is responsible for building the tree."""
        return await self._blocks.list_all()

    async def get_tree(self) -> list[Block]:
        """Return root blocks with their children populated recursively."""
        all_blocks = await self._blocks.list_all()
        return _build_tree(all_blocks)

    async def get_block(self, block_id: UUID) -> Block:
        block = await self._blocks.get(block_id)
        if block is None:
            raise BlockNotFoundError(f"Block '{block_id}' not found")
        return block

    async def get_ancestors(self, block_id: UUID) -> list[Block]:
        """Return ancestor chain ordered root → immediate parent."""
        ancestors: list[Block] = []
        current = await self.get_block(block_id)
        while current.parent_id is not None:
            parent = await self._blocks.get(current.parent_id)
            if parent is None:
                break
            ancestors.append(parent)
            current = parent
        ancestors.reverse()
        return ancestors

    async def get_children(self, block_id: UUID) -> list[Block]:
        return await self._blocks.list_children(block_id)

    # ── WRITE ─────────────────────────────────────────────────────────────

    async def create_block(self, payload: BlockCreate, created_by: str) -> Block:
        if payload.parent_id is not None:
            parent = await self._blocks.get(payload.parent_id)
            if parent is None:
                raise BlockNotFoundError(f"Parent block '{payload.parent_id}' not found")

        block = Block(
            id=uuid4(),
            parent_id=payload.parent_id,
            title=payload.title,
            description=payload.description,
            status=payload.status,
            start_date=payload.start_date,
            deadline=payload.deadline,
            assignees=payload.assignees,
            created_by=created_by,
        )
        await self._blocks.create(block)
        await self._propagate_dates_upward(payload.parent_id)
        return block

    async def update_block(
        self,
        block_id: UUID,
        payload: BlockUpdate,
        actor_id: str,
        actor_name: str,
    ) -> Block:
        block = await self.get_block(block_id)

        if payload.parent_id is not None and payload.parent_id != block.parent_id:
            await self._validate_no_cycle(block_id, payload.parent_id)
            parent = await self._blocks.get(payload.parent_id)
            if parent is None:
                raise BlockNotFoundError(f"Parent block '{payload.parent_id}' not found")

        await self._record_changes(block, payload, actor_id, actor_name)

        old_parent_id = block.parent_id

        if payload.parent_id is not None:
            block.parent_id = payload.parent_id
        if payload.title is not None:
            block.title = payload.title
        if payload.description is not None:
            block.description = payload.description
        if payload.status is not None:
            block.status = payload.status
        if payload.start_date is not None:
            block.start_date = payload.start_date
        if payload.deadline is not None:
            block.deadline = payload.deadline
        if payload.assignees is not None:
            block.assignees = payload.assignees

        await self._blocks.save(block)

        await self._propagate_dates_upward(block.parent_id)
        if old_parent_id and old_parent_id != block.parent_id:
            await self._propagate_dates_upward(old_parent_id)

        return block

    async def delete_block(self, block_id: UUID) -> None:
        block = await self.get_block(block_id)
        await self._delete_recursive(block_id)
        await self._propagate_dates_upward(block.parent_id)

    # ── COMMENTS ─────────────────────────────────────────────────────────

    async def get_comments(self, block_id: UUID) -> list[Comment]:
        await self.get_block(block_id)
        return await self._comments.list_by_block(block_id)

    async def add_comment(
        self,
        block_id: UUID,
        content: str,
        author_id: str,
        author_name: str,
    ) -> Comment:
        await self.get_block(block_id)
        comment = Comment(
            id=uuid4(),
            block_id=block_id,
            author_id=author_id,
            author_name=author_name,
            content=content,
        )
        return await self._comments.create(comment)

    # ── HISTORY ───────────────────────────────────────────────────────────

    async def get_history(self, block_id: UUID) -> list[BlockHistory]:
        await self.get_block(block_id)
        return await self._history.list_by_block(block_id)

    # ── INTERNAL ──────────────────────────────────────────────────────────

    async def _propagate_dates_upward(self, block_id: UUID | None) -> None:
        """Walk up the parent chain updating start_date/deadline from children.

        Rollup-triggered saves do NOT emit history events.
        """
        if block_id is None:
            return

        block = await self._blocks.get(block_id)
        if block is None:
            return

        children = await self._blocks.list_children(block_id)
        if not children:
            return

        start_dates = [c.start_date for c in children if c.start_date is not None]
        deadlines = [c.deadline for c in children if c.deadline is not None]

        new_start = min(start_dates) if start_dates else None
        new_deadline = max(deadlines) if deadlines else None

        changed = False
        if new_start != block.start_date:
            block.start_date = new_start
            changed = True
        if new_deadline != block.deadline:
            block.deadline = new_deadline
            changed = True

        if changed:
            await self._blocks.save(block)

        await self._propagate_dates_upward(block.parent_id)

    async def _record_changes(
        self,
        old: Block,
        payload: BlockUpdate,
        actor_id: str,
        actor_name: str,
    ) -> None:
        for field in TRACKED_FIELDS:
            new_val = getattr(payload, field, None)
            if new_val is None:
                continue
            old_val = getattr(old, field)
            if str(old_val) == str(new_val):
                continue
            await self._history.create(
                BlockHistory(
                    id=uuid4(),
                    block_id=old.id,
                    changed_by_id=actor_id,
                    changed_by_name=actor_name,
                    field=field,
                    old_value=str(old_val) if old_val is not None else None,
                    new_value=str(new_val),
                )
            )

    async def _delete_recursive(self, block_id: UUID) -> None:
        children = await self._blocks.list_children(block_id)
        for child in children:
            await self._delete_recursive(child.id)

        await self._comments.delete_by_block(block_id)
        await self._history.delete_by_block(block_id)
        await self._blocks.delete(block_id)

    async def _validate_no_cycle(self, block_id: UUID, proposed_parent_id: UUID) -> None:
        """Ensure proposed_parent_id is not a descendant of block_id."""
        current_id: UUID | None = proposed_parent_id
        while current_id is not None:
            if current_id == block_id:
                raise BlockCycleError(
                    f"Cannot set block '{proposed_parent_id}' as parent of '{block_id}': would create a cycle"
                )
            node = await self._blocks.get(current_id)
            current_id = node.parent_id if node else None


# ── Tree Builder ───────────────────────────────────────────────────────────

def _build_tree(all_blocks: list[Block]) -> list[Block]:
    """Nest blocks into a tree structure using parent_id references."""
    by_id: dict[UUID, Block] = {b.id: b for b in all_blocks}
    roots: list[Block] = []

    for block in all_blocks:
        block.children = []

    for block in all_blocks:
        if block.parent_id is None:
            roots.append(block)
        else:
            parent = by_id.get(block.parent_id)
            if parent is not None:
                parent.children.append(block)

    return roots

"""Block-related enums and constants."""

from __future__ import annotations

from typing import Final, Literal

BlockStatusLiteral = Literal["triage", "backlog", "todo", "inprogress", "done"]

ALLOWED_STATUSES: Final[set[str]] = {"triage", "backlog", "todo", "inprogress", "done"}

TRACKED_FIELDS: Final[list[str]] = [
    "title",
    "description",
    "status",
    "start_date",
    "deadline",
    "parent_id",
    "assignees",
]

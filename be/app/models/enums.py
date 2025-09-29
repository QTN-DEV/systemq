from __future__ import annotations

from typing import Final, Literal
from collections.abc import Set


DivisionLiteral = Literal[
    "Marketing",
    "Graphic Design",
    "Developer",
    "UI/UX",
    "Internal Ops",
]

PositionLiteral = Literal[
    "CEO",
    "Internal Ops",
    "HR",
    "Div. Lead",
    "PM",
    "Team Member",
]

EmploymentTypeLiteral = Literal["full-time", "part-time", "intern"]

ALLOWED_DIVISIONS: Final[set[str]] = {
    "Marketing",
    "Graphic Design",
    "Developer",
    "UI/UX",
    "Internal Ops",
}

ALLOWED_POSITIONS: Final[set[str]] = {
    "CEO",
    "Internal Ops",
    "HR",
    "Div. Lead",
    "PM",
    "Team Member",
}

ALLOWED_EMPLOYMENT_TYPES: Final[set[str]] = {
    "full-time",
    "part-time",
    "intern",
}


__all__ = [
    "ALLOWED_DIVISIONS",
    "ALLOWED_EMPLOYMENT_TYPES",
    "ALLOWED_POSITIONS",
    "DivisionLiteral",
    "EmploymentTypeLiteral",
    "PositionLiteral",
]

from __future__ import annotations

from typing import Final, Literal
from collections.abc import Set


DivisionLiteral = Literal[
    "Internal Ops",
    "Business Development",
    "Developer",
    "Finance",
    "Graphic Design",
    "Infrastructure",
    "Marketing",
    "UI/UX",
    "Product",
    "Ops Support",
]

PositionLiteral = Literal[
    "Admin",
    "CEO",
    "Internal Ops",
    "Div Lead",
    "PM",
    "Team Member",
]

EmploymentTypeLiteral = Literal["full-time", "part-time", "intern"]

ALLOWED_DIVISIONS: Final[set[str]] = {
    "Internal Ops",
    "Business Development",
    "Developer",
    "Finance",
    "Graphic Design",
    "Infrastructure",
    "Marketing",
    "UI/UX",
    "Product",
    "Ops Support",
}

ALLOWED_POSITIONS: Final[set[str]] = {
    "Admin",
    "CEO",
    "Internal Ops",
    "Div Lead",
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

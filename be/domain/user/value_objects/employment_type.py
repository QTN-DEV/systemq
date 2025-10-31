"""Employment type value object."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Literal


class EmploymentTypeEnum(Enum):
    """Employment types."""
    FULL_TIME = "full-time"
    PART_TIME = "part-time"
    CONTRACT = "contract"
    INTERN = "intern"


EmploymentTypeLiteral = Literal["full-time", "part-time", "contract", "intern"]


@dataclass(frozen=True)
class EmploymentType:
    """Employment type value object."""

    value: EmploymentTypeLiteral

    def __post_init__(self) -> None:
        """Validate employment type value."""
        if self.value not in [et.value for et in EmploymentTypeEnum]:
            raise ValueError(f"Invalid employment type: {self.value}")

    @property
    def is_full_time(self) -> bool:
        """Check if employment is full-time."""
        return self.value == EmploymentTypeEnum.FULL_TIME.value

    @property
    def is_permanent(self) -> bool:
        """Check if employment is permanent (full-time or part-time)."""
        return self.value in [EmploymentTypeEnum.FULL_TIME.value, EmploymentTypeEnum.PART_TIME.value]

    def __str__(self) -> str:
        """String representation."""
        return self.value

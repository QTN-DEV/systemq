from __future__ import annotations

from typing import Final, Literal
from collections.abc import Set


PositionLiteral = Literal[
    "CEO",
    "Internal Ops",
    "HR",
    "PM",
    "Div. Lead",
    "Team Member",
]

EmploymentTypeLiteral = Literal["full-time", "part-time", "intern"]

ALLOWED_POSITIONS: Final[set[str]] = {
    "CEO",
    "Internal Ops",
    "Business Development",
    "Project Manager",
    "Frontend Developer",
    "Backend Developer",
    "Full-Stack Developer",
    "DevOps Engineer",
    "QA Engineer",
    "System Administrator",
    "Security Specialist",
    "Data Analyst",
    "Data Scientist",
    "Database Administrator",
    "UI/UX Designer",
    "Technical Writer",
    "Sales Representative",
    "Marketing Specialist",
    "HR Specialist",
    "Financial Analyst",
    "Legal Counsel",
}

ALLOWED_EMPLOYMENT_TYPES: Final[set[str]] = {
    "full-time",
    "part-time",
    "intern",
}


__all__ = [
    "ALLOWED_EMPLOYMENT_TYPES",
    "ALLOWED_POSITIONS", 
    "EmploymentTypeLiteral",
    "PositionLiteral",
]

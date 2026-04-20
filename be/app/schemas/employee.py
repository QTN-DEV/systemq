"""Employee schema definitions."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, HttpUrl

from app.models.enums import EmploymentTypeLiteral, PositionLiteral


class EmployeeBase(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    title: str | None = None
    division: str | None = None
    level: str | None = None
    position: PositionLiteral | None = None
    subordinates: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    avatar: HttpUrl | None = None
    employment_type: EmploymentTypeLiteral = Field(default="full-time")


class EmployeeCreate(EmployeeBase):
    id: str = Field(min_length=1)


class Employee(EmployeeBase):
    id: str


class EmployeeUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    title: str | None = None
    division: str | None = None
    level: str | None = None
    position: PositionLiteral | None = None
    subordinates: list[str] | None = None
    projects: list[str] | None = None
    avatar: HttpUrl | None = None
    employment_type: EmploymentTypeLiteral | None = None


class ChartEmployee(BaseModel):
    """A single employee's state as edited from the org-chart view.

    Validation is intentionally loose here because the chart view lets the
    user freely invent divisions/positions/etc. via text inputs. The
    `save_chart` service will reconcile these values with the DB.
    """

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    email: str | None = None
    title: str | None = None
    division: str | None = None
    level: str | None = None
    position: str | None = None
    subordinates: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    avatar: str | None = None


class SaveChartPayload(BaseModel):
    """Full snapshot of every employee currently visible on the chart."""

    employees: list[ChartEmployee] = Field(default_factory=list)


class SaveChartResult(BaseModel):
    created: int = 0
    updated: int = 0
    deactivated: int = 0
    skipped: int = 0

"""Workload Analytics schemas."""

from typing import List

from pydantic import BaseModel


class WorkloadPagination(BaseModel):
    total: int
    limit: int
    offset: int
    has_next: bool
    has_prev: bool


class WorkloadSummary(BaseModel):
    total_hours: float
    total_overtime: float
    total_billable: float
    unique_projects: int
    total_entries: int


class WorkloadEntry(BaseModel):
    id: int
    date: str
    user_id: str
    user: str
    project: str
    activity_description: str
    hours_worked: float
    overtime_hours: float
    total_hours: float
    work_type: str
    is_billable: bool
    billable_hours: float
    notes: str
    timestamp: int


class WorkloadEntriesResponse(BaseModel):
    entries: List[WorkloadEntry]
    pagination: WorkloadPagination
    summary: WorkloadSummary

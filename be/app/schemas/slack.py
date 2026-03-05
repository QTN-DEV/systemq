"""Slack message models and schemas."""

from typing import List, Optional

from pydantic import BaseModel, Field


class ManhourSummary(BaseModel):
    date: str = Field(description="Date in YYYY-MM-DD format")
    project_name: str = Field(description="Project name, in lowercase, with ' ' replaced with '-'")
    project_manhour: float = Field(description="Hour spent on the project")
    done_items: List[str] = Field(description="Done items")


class DayPlan(BaseModel):
    date: str = Field(description="Date in YYYY-MM-DD format")
    project_name: str = Field(description="Project name, in lowercase, with ' ' replaced with '-'")
    otw: List[str] = Field(description="OTW")
    todolist: List[str] = Field(description="TODO")
    blocker: List[str] = Field(description="BLOCKER")
    learn: List[str] = Field(description="LEARNED")
    others: List[dict] = Field(description="For other categories that's not in the list")


class ParsedResult(BaseModel):
    workload_summary: List[ManhourSummary] = Field(
        description="Workload summary, grouped by project_name"
    )
    day_plan: List[DayPlan] = Field(description="Day plan, grouped by project_name")


class ParserStatusResponse(BaseModel):
    is_running: bool
    processed_count: int
    error_count: int
    sleep_interval: float


class CrawlerStatusResponse(BaseModel):
    is_running: bool
    status_message: str


class CrawlerStartRequest(BaseModel):
    start_date: str
    end_date: Optional[str] = None

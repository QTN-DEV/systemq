from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, Field, field_validator, ConfigDict
from beanie import Document, PydanticObjectId


class WorkloadSummary(BaseModel):
    date: datetime
    project_name: str
    project_manhour: float
    done_items: List[str] = []

    @field_validator("project_name", mode="before")
    @classmethod
    def coerce_project_name(cls, v: Any) -> str:
        return str(v) if v is not None else ""

    @field_validator("date", mode="before")
    @classmethod
    def validate_date_dict(cls, v: Any) -> Any:
        if isinstance(v, dict) and "$date" in v:
            return v["$date"]
        return v

class DayPlan(BaseModel):
    date: datetime
    project_name: str
    otw: List[str] = []
    todolist: List[str] = []

    @field_validator("date", mode="before")
    @classmethod
    def validate_date_dict(cls, v: Any) -> Any:
        if isinstance(v, dict) and "$date" in v:
            return v["$date"]
        return v

class ParsedResult(BaseModel):
    workload_summary: List[WorkloadSummary] = []
    day_plan: List[DayPlan] = []
class StandupEntry(Document):
    id: Optional[PydanticObjectId] = Field(default=None, alias="_id")

    user_id: str
    name: str
    content: str
    
    timestamp: datetime
    parsed_at: Optional[datetime] = None
    slack_timestamp: Optional[str] = Field(default=None, alias="slack_ts")
    
    # Add the parsed_result field to map the nested JSON object
    parsed_result: Optional[ParsedResult] = None

    @field_validator("timestamp", "parsed_at", mode="before")
    @classmethod
    def coerce_to_datetime(cls, v: Any) -> Any:
        if isinstance(v, (int, float)):
            return datetime.fromtimestamp(v)
        return v

    @field_validator("slack_timestamp", mode="before")
    @classmethod
    def coerce_slack_ts(cls, v: Any) -> Any:
        if v is None:
            return None
        return str(v)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

    class Settings:
        name = "slack_messages"
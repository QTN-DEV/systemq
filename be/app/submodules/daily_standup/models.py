from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, Field, field_validator, ConfigDict
from beanie import Document, PydanticObjectId


def _coerce_date(v: Any) -> Any:
    """Unwrap Mongo $date dicts, attempt to fix YYYY-DD-MM strings, return None for garbage."""
    try:
        if isinstance(v, dict) and "$date" in v:
            v = v["$date"]
        if isinstance(v, str):
            parts = v.split("-")
            if len(parts) != 3:
                return None
            # YYYY-DD-MM: month > 12 means day and month are swapped — try the swap
            if parts[1].isdigit() and int(parts[1]) > 12:
                swapped = f"{parts[0]}-{parts[2]}-{parts[1]}"
                # Only use the swap if it produces a valid date
                datetime.fromisoformat(swapped)
                v = swapped
        return v
    except Exception:
        return None


class WorkloadSummary(BaseModel):
    date: Optional[datetime] = None
    project_name: str = ""
    project_manhour: float
    done_items: List[str] = []

    @field_validator("project_name", mode="before")
    @classmethod
    def coerce_project_name(cls, v: Any) -> str:
        return str(v) if v is not None else ""

    @field_validator("date", mode="before")
    @classmethod
    def validate_date_dict(cls, v: Any) -> Any:
        return _coerce_date(v)

class DayPlan(BaseModel):
    date: Optional[datetime] = None
    project_name: str = ""
    otw: List[str] = []
    todolist: List[str] = []

    @field_validator("date", mode="before")
    @classmethod
    def validate_date_dict(cls, v: Any) -> Any:
        return _coerce_date(v)

    @field_validator("project_name", mode="before")
    @classmethod
    def coerce_project_name(cls, v: Any) -> str:
        return str(v) if v is not None else ""

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
from datetime import datetime
from typing import Optional, Any
from pydantic import Field, field_validator, ConfigDict
from beanie import Document, PydanticObjectId

class StandupEntry(Document):
    id: Optional[PydanticObjectId] = Field(default=None, alias="_id")

    user_id: str
    name: str
    content: str
    
    timestamp: datetime
    parsed_at: Optional[datetime] = None
    slack_timestamp: Optional[str] = Field(default=None, alias="slack_ts")

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
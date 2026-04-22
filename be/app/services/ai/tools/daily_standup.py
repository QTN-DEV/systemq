import json
import logging
from typing import Any, Optional
from pydantic import BaseModel, Field
from claude_agent_sdk import create_sdk_mcp_server, tool

from app.submodules.daily_standup.repository import get_daily_standup_repo
from app.submodules.daily_standup.schemas import SearchStandUpEntryOptions
from app.submodules.daily_standup.service import DailyStandupService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("daily-standup-service")

class SearchDailyStandupsArgs(BaseModel):
    content: Optional[str] = Field(
        default=None,
        description="Optional case-insensitive text to search in standup content.",
    )
    start_date: Optional[str] = Field(
        default=None,
        description="Optional inclusive start date in YYYY-MM-DD format.",
    )
    end_date: Optional[str] = Field(
        default=None,
        description="Optional inclusive end date in YYYY-MM-DD format.",
    )
    page: int = Field(
        default=1,
        ge=1,
        description="Page number for paginated standup search results.",
    )
    page_size: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Number of standup entries to return per page.",
    )

def format_error(e: Exception) -> dict:
    logger.exception("Error executing tool")
    return {
        "is_error": True,
        "content": [{"type": "text", "text": f"Error: {str(e)}"}],
    }

def format_success(result: Any) -> dict:
    if isinstance(result, list):
        serialized = [
            item.model_dump(mode="json", by_alias=True) if hasattr(item, "model_dump") else item
            for item in result
        ]
    elif hasattr(result, "model_dump"):
        serialized = result.model_dump(mode="json", by_alias=True)
    else:
        serialized = result

    return {
        "content": [{"type": "text", "text": json.dumps(serialized, ensure_ascii=False)}],
    }

@tool(
    name="search_daily_standups",
    description="Search daily standup entries by content and optional date range with pagination.",
    input_schema=SearchDailyStandupsArgs.model_json_schema(),
)
async def search_daily_standups_tool(args: dict) -> dict:
    try:
        logger.info(f"Tool search_daily_standups called with: {args}")
        validated = SearchDailyStandupsArgs(**args)
        options = SearchStandUpEntryOptions.model_validate(validated.model_dump())
        service = DailyStandupService(get_daily_standup_repo())
        results = await service.search(options)
        return format_success(results)
    except Exception as e:
        return format_error(e)

daily_standup_tools_server = create_sdk_mcp_server(
    name="daily-standup-service",
    tools=[search_daily_standups_tool],
)

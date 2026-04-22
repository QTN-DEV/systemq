from pydantic import BaseModel, Field
from claude_agent_sdk import create_sdk_mcp_server, tool

class UpdateDashboardArgs(BaseModel):
    content: str = Field(description="The full updated React component source code for the dashboard.")

@tool(
    name="update_dashboard",
    description="Update the user's dashboard with new React component source code.",
    input_schema=UpdateDashboardArgs.model_json_schema(),
)
async def update_dashboard_tool(args: dict) -> dict:
    content = args.get("content", "")
    return {
        "content": [{"type": "text", "text": content}]
    }

dashboard_tools_server = create_sdk_mcp_server(
    name="dashboard-service",
    tools=[update_dashboard_tool],
)

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
    # Note: This tool is intercepted by the frontend, but the AI still needs to call it.
    # We return a simple success message to the AI.
    return {
        "content": [{"type": "text", "text": "Dashboard update signal sent to frontend."}]
    }

dashboard_tools_server = create_sdk_mcp_server(
    name="dashboard-service",
    tools=[update_dashboard_tool],
)

from pydantic import BaseModel, Field
from claude_agent_sdk import create_sdk_mcp_server, tool

from ..service import WorkspaceService

class AddWorkspaceAiContextArgs(BaseModel):
    workspace_id: str = Field(description="The ID of the workspace.")
    content: str = Field(description="Message that needed for you agent to provide better experience in future user expereinces.")

class GetAllWorkspaceAiContextArgs(BaseModel):
    workspace_id: str = Field(description="The ID of the workspace.")

@tool(
    name="get_all_workspace_ai_context",
    description="Get all AI contexts for a workspace.",
    input_schema=GetAllWorkspaceAiContextArgs.model_json_schema(),
)
async def get_contexts_tool(args: dict) -> dict:

    service = WorkspaceService()

    workspace = await service.get_by_id(args.get("workspace_id", ""))

    if workspace is None:
        return {
            "content": [{"type": "text", "text": "Workspace not found."}]
        }

    contexts_content = await workspace.contexts.list(skip=0, limit=9999)

    content = "\n\n".join([context.content for context in contexts_content])
    
    return {
        "content": [{"type": "text", "text": f"Here is context we have in the workspace: \n\n {content}"}]
    }

@tool(
    name="add_workspace_ai_context",
    description="Add a new AI context to the workspace. For future reference by agents.",
    input_schema=AddWorkspaceAiContextArgs.model_json_schema(),
)
async def add_context_tool(args: dict) -> dict:
    content = args.get("content", "")

    service = WorkspaceService()

    workspace = await service.get_by_id(args.get("workspace_id", ""))

    if workspace is None:
        return {
            "content": [{"type": "text", "text": "Workspace not found."}]
        }

    await workspace.contexts.create(
        content=content
    )

    return {
        "content": [{"type": "text", "text": content}]
    }

workspace_ai_context_mcp = create_sdk_mcp_server(
    name="workspace_ai_context-service",
    tools=[add_context_tool, get_contexts_tool],
)

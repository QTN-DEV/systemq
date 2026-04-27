from typing import Annotated

from fastapi import Depends, HTTPException, Path

from app.submodules.auth import UseAuthContext

from .service import WorkspaceService
from .handles.workspace import WorkspaceHandle

UseWorkspaceService = Annotated[WorkspaceService, Depends()]

async def get_authorized_workspace(
    workspace_id: str,
    service: UseWorkspaceService,
    ctx: UseAuthContext
) -> WorkspaceHandle:
    workspace = await service.get_by_id(workspace_id)
    
    if not workspace:
        raise HTTPException(404, "Workspace not found")
        
    if workspace.owner_id != ctx.user.id:
        raise HTTPException(403, "Access denied")
        
    return workspace

UseWorkspace = Annotated[WorkspaceHandle, Depends(get_authorized_workspace)]

def get_sanitized_path(file_path: str = Path(...)) -> str:
    stripped = file_path.strip("/")
    if not stripped:
        raise HTTPException(400, "Path must not be empty or root")
    return stripped

SanitizedPath = Annotated[str, Depends(get_sanitized_path)]
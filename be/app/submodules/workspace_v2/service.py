import os
from bson.errors import InvalidId
from pathlib import Path

from beanie import PydanticObjectId
from .documents import WorkspaceMetadata
from .handles.workspace import WorkspaceHandle, WorkspaceHandleOptions
from .schemas import WorkspaceListItem

class WorkspaceService:

    @property
    def root_path(self) -> Path:
        return Path(os.getcwd()) / ".data"
    
    def __init__(self):
        self.handles = {}
    
    async def list(self, owner_id: str) -> list[WorkspaceListItem]:
        workspaces = await WorkspaceMetadata.find(WorkspaceMetadata.owner_id == PydanticObjectId(owner_id)).to_list()
        return [WorkspaceListItem(id=str(workspace.id), name=workspace.name) for workspace in workspaces]
    
    async def create(self, name: str, owner_id: str) -> WorkspaceHandle:
        workspace_metadata = WorkspaceMetadata(
            name=name,
            owner_id=owner_id,
        )
        
        await workspace_metadata.insert()

        return WorkspaceHandle(WorkspaceHandleOptions(
            id=str(workspace_metadata.id),
            owner_id=str(workspace_metadata.owner_id),
            root_path=self.root_path / str(workspace_metadata.id)
        ))
    
    async def get_by_id(self, id: str) -> WorkspaceHandle | None:

        try:
            object_id = PydanticObjectId(id)
        except InvalidId:
            return None

        workspace_metadata = await WorkspaceMetadata.get(object_id)

        if workspace_metadata is None:
            return None
        
        return WorkspaceHandle(WorkspaceHandleOptions(
            id=str(workspace_metadata.id),
            owner_id=str(workspace_metadata.owner_id),
            root_path=self.root_path / str(workspace_metadata.id)
        ))
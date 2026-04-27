from collections.abc import AsyncIterable
from typing import Optional

from fastapi import APIRouter, Body, File, Form, HTTPException, Query, UploadFile, status
from fastapi.sse import EventSourceResponse
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import TypeAdapter
from pymongo.errors import DuplicateKeyError, OperationFailure

from app.submodules.auth import UseAuthContext, allow
from app.core import ResponseEnvelope
from app.submodules.ai import AnthropicRunner, PromptBlueprint, StreamChunkModel

from .handles import FolderHandle, DocumentHandle, WorkspaceHandleGetItemByPathOptions
from .schemas import (
    CreateFileInWorkspaceRequest,
    CreateFolderInWorkspaceRequest,
    CreatedWorkspaceItemResponse,
    CreateWorkspaceRequest,
    CreateWorkspaceResponse,
    FileNode,
    WorkspaceChatCreate,
    WorkspaceChatDocumentCreate,
    WorkspaceChatListItem,
    WorkspaceChatResponse,
    WorkspaceListItem,
)
from .dependencies import UseWorkspace, UseWorkspaceService, SanitizedPath

router = APIRouter()


@router.get("/list", response_model=ResponseEnvelope[list[WorkspaceListItem]])
@allow(["read:all"])
async def get_workspaces(context: UseAuthContext, service: UseWorkspaceService):
    result = await service.list(context.user.id)
    return ResponseEnvelope(success=True, result=result)


@router.get("/{workspace_id}/files", response_model=ResponseEnvelope[list[FileNode]])
@allow(["read:all"])
async def get_workspace_files(
    workspace: UseWorkspace,
    context: UseAuthContext,
    in_path: Optional[str] = Query(None, alias="in"),
):
    try:
        result = await workspace.files.list(in_path)
        return ResponseEnvelope(success=True, result=result)
    except PermissionError:
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            detail="Path outside workspace boundaries")
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Path not found")
    except NotADirectoryError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            detail="Path is not a directory")


@router.get("/{workspace_id}/tree", response_model=ResponseEnvelope[list[FileNode]])
@allow(["read:all"])
async def get_workspace_tree(workspace: UseWorkspace, context: UseAuthContext):
    result = await workspace.files.get_tree()
    return ResponseEnvelope(success=True, result=result)


@router.post("/create", response_model=ResponseEnvelope[CreateWorkspaceResponse])
@allow(["write:all"])
async def create_workspace(payload: CreateWorkspaceRequest, context: UseAuthContext, service: UseWorkspaceService):
    try:
        workspace = await service.create(payload.name, context.user.id)
        await workspace.scaffold()
    except DuplicateKeyError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Workspace already exists",
        ) from None
    except OperationFailure:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not persist workspace",
        ) from None
    except OSError:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create workspace folders on disk",
        ) from None

    return ResponseEnvelope(success=True, result=CreateWorkspaceResponse(id=workspace.id))


@router.post(
    "/{workspace_id}/drive/folder",
    response_model=ResponseEnvelope[CreatedWorkspaceItemResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new folder in the workspace",
)
@allow(["write:all"])
async def create_workspace_folder(
    payload: CreateFolderInWorkspaceRequest,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[CreatedWorkspaceItemResponse]:
    try:
        created = await workspace.files.mkdir(payload.path)
    except PermissionError:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Path outside workspace boundaries",
        ) from None
    except FileExistsError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Path already exists",
        ) from None
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except OSError as e:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        ) from None

    return ResponseEnvelope(
        success=True,
        result=CreatedWorkspaceItemResponse(
            relative_path=workspace.files.to_tree_relative_path(created),
        ),
    )

@router.get(
    "/{workspace_id}/chats",
    response_model=ResponseEnvelope[list[WorkspaceChatListItem]],
    summary="List chat threads for this workspace",
)
@allow(["read:all"])
async def list_workspace_chats(
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[list[WorkspaceChatListItem]]:
    result = await workspace.chats.list()
    return ResponseEnvelope(success=True, result=result)


@router.post(
    "/{workspace_id}/chats",
    response_model=ResponseEnvelope[WorkspaceChatResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workspace chat document",
)
@allow(["write:all"])
async def create_workspace_chat(
    workspace: UseWorkspace,
    context: UseAuthContext,
    payload: WorkspaceChatDocumentCreate = Body(default_factory=WorkspaceChatDocumentCreate),
) -> ResponseEnvelope[WorkspaceChatResponse]:
    chat = await workspace.chats.create(
        messages=payload.messages,
        title=payload.title,
    )
    return ResponseEnvelope(success=True, result=chat)

@router.post(
    "/{workspace_id}/chats/{chat_id}/stream",
    response_class=EventSourceResponse,
)
async def workspace_chat_stream(
    chat_id: str,
    context: UseAuthContext,
    workspace: UseWorkspace,
    payload: WorkspaceChatCreate,
) -> AsyncIterable[StreamChunkModel]:
    blueprint = PromptBlueprint(
        template="",
        working_directory=str(workspace.root_path),
    ).use_model("claude-haiku-4-5-20251001")

    runner = AnthropicRunner(blueprint)

    async for chunk in runner.run():
        yield chunk 

@router.post(
    "/{workspace_id}/drive/file",
    response_model=ResponseEnvelope[CreatedWorkspaceItemResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new file with UTF-8 body (e.g. markdown text); for arbitrary binary, use /drive/upload",
)
@allow(["write:all"])
async def create_workspace_file(
    payload: CreateFileInWorkspaceRequest,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[CreatedWorkspaceItemResponse]:
    try:
        written = await workspace.files.create(
            payload.path,
            payload.content.encode("utf-8"),
        )
    except PermissionError:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Path outside workspace boundaries",
        ) from None
    except FileExistsError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Path already exists",
        ) from None
    except IsADirectoryError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except OSError as e:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        ) from None

    return ResponseEnvelope(
        success=True,
        result=CreatedWorkspaceItemResponse(
            relative_path=workspace.files.to_tree_relative_path(written),
        ),
    )


@router.post(
    "/{workspace_id}/drive/upload",
    response_model=ResponseEnvelope[CreatedWorkspaceItemResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file to a new path (binary; fails if the path already exists)",
)
@allow(["write:all"])
async def upload_file_to_workspace(
    context: UseAuthContext,
    workspace: UseWorkspace,
    file: UploadFile = File(...),
    path: str = Form(
        ...,
        description="Full path relative to workspace including file name, e.g. data/report.bin",
    ),
) -> ResponseEnvelope[CreatedWorkspaceItemResponse]:
    p = (path or "").strip()
    if not p:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            detail="path is required")

    data = await file.read()
    try:
        written = await workspace.files.create(p, data)
    except PermissionError:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Path outside workspace boundaries",
        ) from None
    except FileExistsError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Path already exists",
        ) from None
    except IsADirectoryError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except OSError as e:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        ) from None

    return ResponseEnvelope(
        success=True,
        result=CreatedWorkspaceItemResponse(
            relative_path=workspace.files.to_tree_relative_path(written),
        ),
    )


@router.put("/{workspace_id}/files/{file_path:path}")
@allow(["write:all"])
async def update_workspace_file(
    file_path: SanitizedPath,
    workspace: UseWorkspace,
    context: UseAuthContext,
    content: bytes = Body(..., media_type="application/octet-stream"),
) -> FileResponse:
    try:
        written = await workspace.files.write(file_path, content)
    except PermissionError:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Path outside workspace boundaries",
        ) from None
    except IsADirectoryError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Path is a directory",
        ) from None
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            detail=str(e)) from None

    return FileResponse(
        path=written,
        filename=written.name,
        media_type="text/markdown" if written.suffix.lower() == ".md" else None,
        content_disposition_type="inline",
    )


@router.delete("/{workspace_id}", response_model=ResponseEnvelope[None])
@allow(["write:all"])
async def delete_workspace(
    workspace: UseWorkspace,
    context: UseAuthContext,
):
    await workspace.delete()
    return ResponseEnvelope(success=True, result=None)


@router.delete("/{workspace_id}/files/{file_path:path}", response_model=ResponseEnvelope[None])
@allow(["write:all"])
async def delete_workspace_path(
    file_path: SanitizedPath,
    workspace: UseWorkspace,
    context: UseAuthContext,
):
    try:
        await workspace.files.delete(file_path)
    except PermissionError:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Path outside workspace boundaries",
        ) from None
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND,
                            detail="Path not found") from None
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            detail=str(e)) from None
    except OSError:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete path",
        ) from None

    return ResponseEnvelope(success=True, result=None)


@router.get("/{workspace_id}/files/{file_path:path}")
@allow(["read:all"])
async def get_workspace_file(
    file_path: SanitizedPath,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> FileResponse:
    try:
        file = await workspace.files.get(
            WorkspaceHandleGetItemByPathOptions(path=file_path),
        )

        if isinstance(file, FolderHandle):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Path is a directory; use GET .../files?in=... to list it",
            )
        return FileResponse(
            path=file.path,
            filename=file.path.name,
            media_type="text/markdown" if isinstance(
                file, DocumentHandle) else None,
            content_disposition_type="inline",
        )

    except PermissionError:
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            detail="Path outside workspace boundaries")
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Path not found")

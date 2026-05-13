import json
import os
import zipfile
from collections.abc import AsyncIterable
from pathlib import PurePosixPath
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
    PaginatedResponse,
    SkillCreate,
    SkillResponse,
    SkillUpdate,
    SkillRename,
    WorkflowCreate,
    WorkflowListItem,
    WorkflowResponse,
    WorkflowUpdate,
    WorkflowExecuteRequest,
    WorkspaceChatCreate,
    WorkspaceChatDocumentCreate,
    WorkspaceChatMessage,
    WorkspaceChatListItem,
    WorkspaceChatRename,
    WorkspaceChatResponse,
    WorkspaceListItem,
    WorkspaceFileUploadResponse,
    WorkspaceAiContextCreate,
    WorkspaceAiContextResponse,
    WorkspaceInstructionResponse,
    WorkspaceInstructionUpdate,
    GenerateTitleRequest,
    GenerateTitleResponse,
)
from .dependencies import UseWorkspace, UseWorkspaceService, SanitizedPath
from .mcps import workspace_ai_context_mcp
from .constants import PROMPTS_DIR

router = APIRouter()

def _skill_display_name(name: str) -> str:
    base = name.strip()
    return base[:-3] if base.lower().endswith(".md") else base

def _skill_file_path(name: str) -> str:
    safe = _skill_display_name(name)
    if not safe or any(c in safe for c in ("/", "\\", "..")):
        raise ValueError("Invalid skill name")
    return f".claude/skills/{safe}/SKILL.md"

def _skill_dir_path(name: str) -> str:
    safe = _skill_display_name(name)
    if not safe or any(c in safe for c in ("/", "\\", "..")):
        raise ValueError("Invalid skill name")
    return f".claude/skills/{safe}"



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
        created = await workspace.files.make_directory(payload.path)
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
    items = await workspace.chats.list()
    return ResponseEnvelope(success=True, result=items)


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

@router.get(
    "/{workspace_id}/chats/{chat_id}",
    response_model=ResponseEnvelope[WorkspaceChatResponse],
    summary="Get a specific workspace chat document",
)
@allow(["read:all"])
async def get_workspace_chat(
    chat_id: str,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[WorkspaceChatResponse]:
    from beanie import PydanticObjectId
    try:
        cid = PydanticObjectId(chat_id)
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid chat id") from exc
        
    chat = await workspace.chats.get(str(cid))
    if chat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat not found")
        
    return ResponseEnvelope(success=True, result=chat)


@router.delete(
    "/{workspace_id}/chats/{chat_id}",
    response_model=ResponseEnvelope[None],
    summary="Delete a workspace chat",
)
@allow(["write:all"])
async def delete_workspace_chat(
    chat_id: str,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[None]:
    try:
        await workspace.chats.delete(chat_id)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ResponseEnvelope(success=True, result=None)


@router.patch(
    "/{workspace_id}/chats/{chat_id}/title",
    response_model=ResponseEnvelope[WorkspaceChatListItem],
    summary="Rename a workspace chat title",
    operation_id="renameWorkspaceChat"
)
@allow(["write:all"])
async def rename_workspace_chat(
    chat_id: str,
    payload: WorkspaceChatRename,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[WorkspaceChatListItem]:
    try:
        result = await workspace.chats.update(chat_id, title=payload.title)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ResponseEnvelope(
        success=True,
        result=WorkspaceChatListItem(id=result.id, title=result.title),
    )


@router.post(
    "/{workspace_id}/chats/{chat_id}/title",
    response_model=GenerateTitleResponse,
    summary="Generate a title for the chat based on messages",
    operation_id="generateWorkspaceChatTitle"
)
@allow(["write:all"])
async def generate_workspace_chat_title(
    chat_id: str,
    payload: GenerateTitleRequest,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> GenerateTitleResponse:
    import anthropic
    import json
    chat_history_str = json.dumps(payload.messages, indent=2)
            
    if not payload.messages:
        return GenerateTitleResponse(title="New Chat")
        
    try:
        from app.submodules.ai import PromptBlueprint
        import anthropic

        blueprint = PromptBlueprint(
            template="{{chat_history_str}}",
            working_directory=str(workspace.root_path)
        )
        blueprint.set_vars(chat_history_str=chat_history_str)
        blueprint.set_system_prompt(
            "Act as a title generator. Summarize the user's intent in 2-5 words. "
            "Use Title Case. Do not use punctuation or quotes. "
            "Output ONLY the title."
        )
        pkg = blueprint.build()
        
        client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=20,
            system=pkg["system_prompt"],
            messages=[
                {"role": "user", "content": pkg["prompt"]}
            ]
        )
        
        title = ""
        if hasattr(response, "content") and len(response.content) > 0:
            title = response.content[0].text.strip(' \n\r\t"\'')
            
        if not title:
            title = "New Chat"
            
        return GenerateTitleResponse(title=title)
    except Exception as exc:
        print(f"Error generating chat title: {exc}")
        return GenerateTitleResponse(title="New Chat")


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
    blueprint = PromptBlueprint(working_directory=str(workspace.root_path))
    blueprint.set_prompt_from_file(os.path.join(PROMPTS_DIR, "conversation.hbs"))
    blueprint.set_vars(
        root_path=str(workspace.root_path),
        workspace_id=str(workspace.id),
        messages=[m.model_dump() for m in payload.messages],
        employee_id=context.user.employee_id,
    )
    blueprint.set_system_prompt_from_file(os.path.join(PROMPTS_DIR, "workspace_assistant.hbs"))
    from app.submodules.drive import drive_documents_mcp
    blueprint.add_mcp("workspace_ai_context", workspace_ai_context_mcp)
    blueprint.add_mcp("drive-documents-service", drive_documents_mcp)
    blueprint.set_model(payload.model or "claude-sonnet-4-5-20250929")

    runner = AnthropicRunner(blueprint)

    async for chunk in runner.run():
        yield chunk 

@router.post(
    "/{workspace_id}/chats/{chat_id}/messages",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Append a message to a workspace chat",
)
@allow(["write:all"])
async def append_workspace_chat_message(
    chat_id: str,
    payload: WorkspaceChatMessage,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> None:
    try:
        await workspace.chats.append_message(chat_id, payload)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

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

    # Zip files are extracted in-place rather than stored as a single archive.
    if (file.filename or "").lower().endswith(".zip"):
        parent = str(PurePosixPath(p).parent)
        folder = "" if parent in (".", "") else parent
        try:
            await workspace.files.extract_zip(data, folder)
        except zipfile.BadZipFile:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Invalid or corrupt zip file",
            ) from None
        except PermissionError:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="Path outside workspace boundaries",
            ) from None
        except OSError as e:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e),
            ) from None

        display_path = f"/{folder}" if folder else "/"
        return ResponseEnvelope(
            success=True,
            result=CreatedWorkspaceItemResponse(relative_path=display_path),
        )

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
                file, DocumentHandle) else file.mimetype,
            content_disposition_type="inline",
            headers={
                "Access-Control-Allow-Origin": "*",
            }
        )

    except PermissionError:
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            detail="Path outside workspace boundaries")
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Path not found")


@router.post(
    "/{workspace_id}/skills",
    response_model=ResponseEnvelope[SkillResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a skill markdown file",
)
@allow(["write:all"])
async def create_workspace_skill(
    payload: SkillCreate,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[SkillResponse]:
    try:
        path = _skill_file_path(payload.name)
        await workspace.files.create(path, payload.content.encode("utf-8"))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except PermissionError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Path outside workspace boundaries") from None
    except FileExistsError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Skill already exists") from exc
    
    return ResponseEnvelope(
        success=True, 
        result=SkillResponse(name=_skill_display_name(payload.name), content=payload.content)
    )


@router.post(
    "/{workspace_id}/skills/upload",
    response_model=ResponseEnvelope[SkillResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload a skill markdown file",
    operation_id="uploadWorkspaceSkill",
)
@allow(["write:all"])
async def upload_workspace_skill(
    workspace: UseWorkspace,
    context: UseAuthContext,
    file: UploadFile = File(...),
    name: str = Form(..., description="Name of the skill"),
) -> ResponseEnvelope[SkillResponse]:
    safe_name = _skill_display_name(name)
    try:
        path = _skill_file_path(name)
        content = await file.read()
        await workspace.files.create(path, content)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except PermissionError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Path outside workspace boundaries") from None
    except FileExistsError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Skill already exists") from exc
        
    return ResponseEnvelope(
        success=True, 
        result=SkillResponse(name=safe_name, content=content.decode("utf-8", errors="replace"))
    )


@router.patch(
    "/{workspace_id}/skills/{name}/rename",
    response_model=ResponseEnvelope[SkillResponse],
    summary="Rename a skill",
    operation_id="renameWorkspaceSkill",
)
@allow(["write:all"])
async def rename_workspace_skill(
    name: str,
    payload: SkillRename,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[SkillResponse]:
    try:
        old_dir = _skill_dir_path(name)
        new_dir = _skill_dir_path(payload.name)
        await workspace.files.move(old_dir, new_dir)
        
        new_file_path = _skill_file_path(payload.name)
        file_handle = await workspace.files.get(WorkspaceHandleGetItemByPathOptions(path=new_file_path))
        content = file_handle.path.read_text(encoding="utf-8")
        
        return ResponseEnvelope(
            success=True, 
            result=SkillResponse(name=_skill_display_name(payload.name), content=content)
        )
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Skill not found")
    except FileExistsError:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Target skill already exists")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except PermissionError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Path outside workspace boundaries") from None


@router.get(
    "/{workspace_id}/skills/{name}",
    response_model=ResponseEnvelope[SkillResponse],
    summary="Read a skill file",
)
@allow(["read:all"])
async def get_workspace_skill(
    name: str,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[SkillResponse]:
    try:
        path = _skill_file_path(name)
        file_handle = await workspace.files.get(WorkspaceHandleGetItemByPathOptions(path=path))
        if isinstance(file_handle, FolderHandle):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Path is a directory")
        
        if not file_handle.path.exists():
            raise FileNotFoundError()
            
        content = file_handle.path.read_text(encoding="utf-8")
        return ResponseEnvelope(
            success=True, 
            result=SkillResponse(name=_skill_display_name(name), content=content)
        )
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Skill not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except PermissionError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Path outside workspace boundaries") from None


@router.put(
    "/{workspace_id}/skills/{name}",
    response_model=ResponseEnvelope[SkillResponse],
    summary="Update a skill file",
)
@allow(["write:all"])
async def update_workspace_skill(
    name: str,
    payload: SkillUpdate,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[SkillResponse]:
    try:
        path = _skill_file_path(name)
        await workspace.files.write(path, payload.content.encode("utf-8"))
        return ResponseEnvelope(
            success=True, 
            result=SkillResponse(name=_skill_display_name(name), content=payload.content)
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except PermissionError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Path outside workspace boundaries") from None
    except IsADirectoryError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Path is a directory") from None


@router.delete(
    "/{workspace_id}/skills/{name}",
    response_model=ResponseEnvelope[None],
    summary="Delete a skill file",
)
@allow(["write:all"])
async def delete_workspace_skill(
    name: str,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[None]:
    try:
        path = _skill_dir_path(name)
        await workspace.files.delete(path)
        return ResponseEnvelope(success=True, result=None)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Skill not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except PermissionError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Path outside workspace boundaries") from None


# ---------------------------------------------------------------------------
# AI Contexts
# ---------------------------------------------------------------------------

@router.get(
    "/{workspace_id}/contexts",
    response_model=ResponseEnvelope[PaginatedResponse[WorkspaceAiContextResponse]],
    summary="List AI context entries for a workspace (paginated)",
)
@allow(["read:all"])
async def list_workspace_contexts(
    workspace: UseWorkspace,
    context: UseAuthContext,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
) -> ResponseEnvelope[PaginatedResponse[WorkspaceAiContextResponse]]:
    skip = (page - 1) * page_size
    items = await workspace.contexts.list(skip=skip, limit=page_size)
    total = await workspace.contexts.count()
    return ResponseEnvelope(
        success=True,
        result=PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(skip + page_size) < total,
        ),
    )


@router.post(
    "/{workspace_id}/contexts",
    response_model=ResponseEnvelope[WorkspaceAiContextResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new AI context entry for a workspace",
)
@allow(["write:all"])
async def create_workspace_context(
    payload: WorkspaceAiContextCreate,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[WorkspaceAiContextResponse]:
    item = await workspace.contexts.create(payload.content)
    return ResponseEnvelope(success=True, result=item)


@router.get(
    "/{workspace_id}/contexts/{context_id}",
    response_model=ResponseEnvelope[WorkspaceAiContextResponse],
    summary="Get a single AI context entry",
)
@allow(["read:all"])
async def get_workspace_context(
    context_id: str,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[WorkspaceAiContextResponse]:
    try:
        item = await workspace.contexts.get(context_id)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Context not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ResponseEnvelope(success=True, result=item)


@router.delete(
    "/{workspace_id}/contexts/{context_id}",
    response_model=ResponseEnvelope[None],
    summary="Delete an AI context entry",
)
@allow(["write:all"])
async def delete_workspace_context(
    context_id: str,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[None]:
    try:
        await workspace.contexts.delete(context_id)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Context not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ResponseEnvelope(success=True, result=None)

def _workflow_to_response(wf) -> WorkflowResponse:
    return WorkflowResponse(
        name=wf.name,
        id=wf.id,
        display_name=wf.display_name,
        description=wf.description,
        version=wf.version,
        inputs=wf.inputs,
        prompt_template=wf.prompt_template,
        allowed_tools=wf.allowed_tools,
        disallowed_tools=wf.disallowed_tools,
        max_turns=wf.max_turns,
        max_budget_usd=wf.max_budget_usd,
        model=wf.model,
        mcp_servers=wf.mcp_servers,
        raw=wf.to_dict(),
    )


@router.get(
    "/{workspace_id}/workflows",
    response_model=ResponseEnvelope[list[WorkflowListItem]],
    summary="List all workflow definitions in the workspace",
)
@allow(["read:all"])
async def list_workspace_workflows(
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[list[WorkflowListItem]]:
    workflows = await workspace.workflows.list()
    return ResponseEnvelope(
        success=True,
        result=[
            WorkflowListItem(
                name=wf.name,
                id=wf.id,
                display_name=wf.display_name,
                description=wf.description,
            )
            for wf in workflows
        ],
    )


@router.post(
    "/{workspace_id}/workflows",
    response_model=ResponseEnvelope[WorkflowResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workflow YAML file",
)
@allow(["write:all"])
async def create_workspace_workflow(
    payload: WorkflowCreate,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[WorkflowResponse]:
    slug = (payload.id or payload.name).strip().lower().replace(" ", "-")
    data = payload.model_dump(exclude_none=True)
    data["id"] = slug
    try:
        wf = await workspace.workflows.create(slug, data)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FileExistsError:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Workflow already exists") from None
    return ResponseEnvelope(success=True, result=_workflow_to_response(wf))


@router.get(
    "/{workspace_id}/workflows/{name}",
    response_model=ResponseEnvelope[WorkflowResponse],
    summary="Get a single workflow definition",
)
@allow(["read:all"])
async def get_workspace_workflow(
    name: str,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[WorkflowResponse]:
    try:
        wf = await workspace.workflows.get(name)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    return ResponseEnvelope(success=True, result=_workflow_to_response(wf))


@router.put(
    "/{workspace_id}/workflows/{name}",
    response_model=ResponseEnvelope[WorkflowResponse],
    summary="Replace a workflow YAML file (full update)",
)
@allow(["write:all"])
async def update_workspace_workflow(
    name: str,
    payload: WorkflowUpdate,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[WorkflowResponse]:
    try:
        existing = await workspace.workflows.get(name)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    # Merge: existing data first, then overlay with non-None fields from payload
    merged = existing.to_dict()
    for field, value in payload.model_dump(exclude_none=True).items():
        merged[field] = value

    try:
        wf = await workspace.workflows.update(name, merged)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    return ResponseEnvelope(success=True, result=_workflow_to_response(wf))


@router.delete(
    "/{workspace_id}/workflows/{name}",
    response_model=ResponseEnvelope[None],
    summary="Delete a workflow YAML file",
)
@allow(["write:all"])
async def delete_workspace_workflow(
    name: str,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[None]:
    try:
        await workspace.workflows.delete(name)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    return ResponseEnvelope(success=True, result=None)


@router.post(
    "/{workspace_id}/workflows/{name}/execute",
    response_class=EventSourceResponse,
    summary="Execute a workflow and stream the response",
    operation_id="workspaceExecuteWorkflow"
)
async def execute_workspace_workflow(
    name: str,
    payload: WorkflowExecuteRequest,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> AsyncIterable[StreamChunkModel]:
    try:
        wf = await workspace.workflows.get(name)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    # Replace {input} syntax in the template with actual values
    # because the prompt templates often use single brackets.
    template_str = wf.prompt_template
    for key, val in payload.inputs.items():
        template_str = template_str.replace(f"{{{key}}}", str(val))

    blueprint = PromptBlueprint(
        template=template_str,
        working_directory=str(workspace.root_path)
    )
    
    blueprint.set_vars(
        **payload.inputs,
        workspace_id=str(workspace.id),
        root_path=str(workspace.root_path),
    )
    
    if wf.model:
        blueprint.set_model(wf.model)
        
    if wf.max_turns is not None:
        blueprint._max_turns = wf.max_turns
        
    if wf.max_budget_usd is not None:
        blueprint._max_budget_usd = wf.max_budget_usd

    blueprint.configure_tools(allowed=wf.allowed_tools, disallowed=wf.disallowed_tools)
    
    blueprint.add_mcp("workspace_ai_context", workspace_ai_context_mcp)

    if getattr(wf, "mcp_servers", None):
        pass

    runner = AnthropicRunner(blueprint)

    async for chunk in runner.run():
        yield chunk

@router.get(
    "/{workspace_id}/instruction",
    response_model=ResponseEnvelope[WorkspaceInstructionResponse],
    summary="Get the workspace instruction (CLAUDE.md)",
    operation_id="getWorkspaceInstruction"
)
@allow(["read:all"])
async def get_workspace_instruction(
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[WorkspaceInstructionResponse]:
    path = "CLAUDE.md"
    try:
        from .handles import WorkspaceHandleGetItemByPathOptions, FolderHandle
        file_handle = await workspace.files.get(WorkspaceHandleGetItemByPathOptions(path=path))
        if isinstance(file_handle, FolderHandle):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Path is a directory")
        content = file_handle.path.read_text(encoding="utf-8")
    except FileNotFoundError:
        content = ""
    return ResponseEnvelope(success=True, result=WorkspaceInstructionResponse(content=content))


@router.put(
    "/{workspace_id}/instruction",
    response_model=ResponseEnvelope[WorkspaceInstructionResponse],
    summary="Update the workspace instruction (CLAUDE.md)",
    operation_id="updateWorkspaceInstruction"
)
@allow(["write:all"])
async def update_workspace_instruction(
    payload: WorkspaceInstructionUpdate,
    workspace: UseWorkspace,
    context: UseAuthContext,
) -> ResponseEnvelope[WorkspaceInstructionResponse]:
    path = "CLAUDE.md"
    try:
        await workspace.files.write(path, payload.content.encode("utf-8"))
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ResponseEnvelope(success=True, result=WorkspaceInstructionResponse(content=payload.content))


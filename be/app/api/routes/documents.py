"""Document routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query, status

from app.logging_utils import get_logger, log_debug, log_info, log_warning
from app.schemas import (
    DistinctValuesResponse,
    DocumentBreadcrumbSchema,
    DocumentCreate,
    DocumentResponse,
    DocumentUpdate,
    ItemCountResponse,
    MessageResponse,
    UserProfile,
)
from app.services import auth as auth_service
from app.services import document as document_service
from app.services.auth import AuthenticationError, UserNotFoundError
from app.services.document import DocumentAlreadyExistsError, DocumentNotFoundError
from app.services.document_permission import (
    can_user_edit_document,
    can_user_view_document,
    check_document_access,
    get_document_access_summary,
)
from app.models.document import DocumentItem  # NEW

_ALLOWED_OWNER_ROLES = {"admin", "manager", "employee", "secretary"}


def _derive_owner_payload(profile: UserProfile) -> dict[str, Any]:
    role: str | None = None
    for candidate in (profile.level, profile.position):
        if candidate and candidate.lower() in _ALLOWED_OWNER_ROLES:
            role = candidate.lower()
            break
    if role is None:
        role = "employee"
    avatar = str(profile.avatar) if profile.avatar else None
    return {
        "id": profile.id,
        "name": profile.name,
        "role": role,
        "avatar": avatar,
    }


router = APIRouter(prefix="/documents", tags=["Documents"])
logger = get_logger(__name__)


@router.get(
    "/",
    response_model=list[DocumentResponse],
    summary="List documents by parent",
    response_description="Documents that belong to the requested parent folder.",
)
async def list_documents(
    parent_id: str | None = Query(None),
    authorization: str = Header(alias="Authorization"),
) -> list[DocumentResponse]:
    log_info(logger, "list_documents called", parent_id=parent_id)
    try:
        token = auth_service.parse_bearer_token(authorization)
        profile_payload = await auth_service.get_user_profile_from_token(token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    owner_payload = _derive_owner_payload(UserProfile.model_validate(profile_payload))

    documents = await document_service.get_documents_by_parent(parent_id, owner_payload["id"])
    log_debug(logger, "list_documents resolved", parent_id=parent_id, result_count=len(documents))
    return [DocumentResponse.model_validate(doc) for doc in documents]


# -----------------------------
# NEW: Search across accessible
# -----------------------------
@router.get(
    "/search",
    response_model=list[DocumentResponse],
    summary="Search accessible documents",
    response_description="All documents/folders matching query that the current user can access.",
)
async def search_documents(
    q: str = Query(..., min_length=1, description="Text to search in name/category"),
    types: list[str] | None = Query(
        None,
        description="Repeat param for multiple types, e.g. ?types=file&types=folder",
    ),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    authorization: str = Header(alias="Authorization"),
) -> list[DocumentResponse]:
    """
    Find docs/folders by name/category (case-insensitive) that the caller can view.
    - Respects direct & inherited access via `check_document_access`
    - Filters by types=['file','folder'] if provided
    - Paginates using limit+offset *after* access filtering (keeps code simple)
    """
    log_info(logger, "search_documents called", query=q, types=types, limit=limit, offset=offset)
    # Auth -> user
    try:
        token = auth_service.parse_bearer_token(authorization)
        profile_payload = await auth_service.get_user_profile_from_token(token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    user = UserProfile.model_validate(profile_payload)

    # Validate type filter
    allowed_types = {"file", "folder"}
    type_filter: list[str] | None = None
    if types:
        type_filter = [t for t in types if t in allowed_types]
        if not type_filter:
            type_filter = None

    # Build simple regex query on name/category + not deleted
    base_query: dict[str, Any] = {
        "is_deleted": False,
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
        ],
    }
    if type_filter:
        base_query["type"] = {"$in": type_filter}

    # Fetch candidates (broad), then access-filter
    candidates = await DocumentItem.find(base_query).to_list()

    accessible: list[dict[str, Any]] = []
    for doc in candidates:
        try:
            # viewer access (direct or inherited, assuming your check does inherited)
            if await check_document_access(doc.document_id, user.id, "viewer"):
                # service ensures content normalization + shape
                accessible.append(document_service._serialize_document(doc))  # type: ignore[attr-defined]
        except Exception:
            # silently skip inaccessible/broken docs (consistent with listing semantics)
            continue

    # Sort newest modified first (fallbacks if missing)
    def _sort_key(d: dict[str, Any]):
        # d keys follow _serialize_document shape
        return d.get("last_modified") or d.get("date_created") or ""

    accessible.sort(key=_sort_key, reverse=True)

    # Pagination after access-filter
    sliced = accessible[offset : offset + limit]
    log_debug(logger, "search_documents resolved", accessible=len(accessible), returned=len(sliced))
    return [DocumentResponse.model_validate(item) for item in sliced]


# -----------------------------


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Retrieve a document",
    response_description="Full metadata for the requested document.",
)
async def get_document(
    document_id: str,
    authorization: str = Header(alias="Authorization"),
) -> DocumentResponse:
    log_info(logger, "get_document called", document_id=document_id)
    # Enforce access (direct or inherited from ancestor folders)
    try:
        token = auth_service.parse_bearer_token(authorization)
        profile_payload = await auth_service.get_user_profile_from_token(token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    user = UserProfile.model_validate(profile_payload)

    allowed = await can_user_view_document(document_id, user.id)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    try:
        document_payload = await document_service.get_document_payload(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    if isinstance(document_payload, dict):
        owned_by_payload = document_payload.get("owned_by")
    else:
        owned_by_payload = getattr(document_payload, "owned_by", None)
    owner_id = getattr(owned_by_payload, "id", None)
    if owner_id is None and isinstance(owned_by_payload, dict):
        owner_id = owned_by_payload.get("id")
    log_debug(
        logger,
        "get_document resolved",
        document_id=document_id,
        owner=owner_id,
    )
    return DocumentResponse.model_validate(document_payload)


@router.get(
    "/{document_id}/item-count",
    response_model=ItemCountResponse,
    summary="Count immediate children",
    response_description="Number of active items directly under the folder.",
)
async def get_item_count(document_id: str) -> ItemCountResponse:
    count = await document_service.get_item_count(document_id)
    return ItemCountResponse(count=count)


@router.get(
    "/{document_id}/path-ids",
    response_model=list[str],
    summary="Resolve folder ancestor identifiers",
    response_description="Ordered identifiers of ancestor folders ending with the requested id.",
)
async def get_folder_path_ids(document_id: str) -> list[str]:
    try:
        return await document_service.get_folder_path_ids(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get(
    "/{document_id}/breadcrumbs",
    response_model=list[DocumentBreadcrumbSchema],
    summary="Build breadcrumb trail",
    response_description="Breadcrumb entries from the root to the requested folder.",
)
async def get_breadcrumbs(document_id: str) -> list[DocumentBreadcrumbSchema]:
    breadcrumbs = await document_service.build_breadcrumbs(document_id)
    return [DocumentBreadcrumbSchema.model_validate(crumb) for crumb in breadcrumbs]


@router.get(
    "/types",
    response_model=DistinctValuesResponse,
    summary="List document types",
    response_description="Distinct document types recorded in the repository.",
)
async def get_document_types(
    search: str | None = Query(None),
) -> DistinctValuesResponse:
    values = await document_service.get_document_types(search)
    return DistinctValuesResponse(values=values)


@router.get(
    "/categories",
    response_model=DistinctValuesResponse,
    summary="List document categories",
    response_description="Distinct document categories recorded in the repository.",
)
async def get_document_categories(
    search: str | None = Query(None),
) -> DistinctValuesResponse:
    values = await document_service.get_document_categories(search)
    return DistinctValuesResponse(values=values)


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Create a document",
)
async def create_document(
    payload: DocumentCreate,
    authorization: str = Header(alias="Authorization"),
) -> DocumentResponse:
    try:
        token = auth_service.parse_bearer_token(authorization)
        profile_payload = await auth_service.get_user_profile_from_token(token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    owner_payload = _derive_owner_payload(UserProfile.model_validate(profile_payload))

    try:
        document = await document_service.create_document(
            payload,
            owner_payload,
        )
    except DocumentAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return DocumentResponse.model_validate(document)


@router.patch(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Update document metadata",
    response_description="Updated document representation after applying changes.",
)
async def update_document(
    document_id: str,
    payload: DocumentUpdate,
    authorization: str = Header(alias="Authorization"),
    commit: bool = Query(False),
) -> DocumentResponse:
    # identify editor and enforce edit access
    try:
        token = auth_service.parse_bearer_token(authorization)
        profile_payload = await auth_service.get_user_profile_from_token(token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    user = UserProfile.model_validate(profile_payload)
    allowed = await can_user_edit_document(document_id, user.id)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    try:
        document = await document_service.update_document(
            document_id,
            payload.model_dump(exclude_unset=True),
            editor={"id": user.id, "name": user.name},
            commit=commit,
        )
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return DocumentResponse.model_validate(document)


@router.get(
    "/{document_id}/history",
    summary="Get edit history (coalesced)",
)
async def get_edit_history(document_id: str, authorization: str = Header(alias="Authorization")) -> list[dict]:
    # Only owner/editor can view history
    log_info(logger, "get_edit_history called", document_id=document_id)
    try:
        token = auth_service.parse_bearer_token(authorization)
        profile_payload = await auth_service.get_user_profile_from_token(token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    user = UserProfile.model_validate(profile_payload)

    # owner or editor access
    from app.services.document_permission import has_direct_document_access, has_ancestor_folder_access
    is_owner = False
    try:
        doc = await document_service.get_document_by_id(document_id)
        is_owner = doc.owned_by.id == user.id
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    can_edit = await can_user_edit_document(document_id, user.id)
    if not (is_owner or can_edit):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    events = await document_service.get_edit_history(document_id)
    log_debug(logger, "get_edit_history resolved", document_id=document_id, events=len(events))
    return events


@router.delete(
    "/{document_id}",
    response_model=MessageResponse,
    summary="Soft delete a document",
    response_description="Confirmation that the document was marked as deleted.",
)
async def delete_document(
    document_id: str,
    authorization: str = Header(alias="Authorization"),
) -> MessageResponse:
    # Only owner can delete (no inherited/editor rights)
    try:
        token = auth_service.parse_bearer_token(authorization)
        profile_payload = await auth_service.get_user_profile_from_token(token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    user = UserProfile.model_validate(profile_payload)

    # Load document to verify ownership
    try:
        document = await document_service.get_document_by_id(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    if document.owned_by.id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can delete this item")

    try:
        await document_service.delete_document(document_id)
    except DocumentNotFoundError as exc:
        # Race conditions: treat as 404
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return MessageResponse(message="Document deleted successfully.")


@router.get(
    "/{document_id}/access",
    summary="Get effective access for current user",
    response_description="Effective can_view/can_edit considering direct and inherited permissions.",
)
async def get_my_access(
    document_id: str,
    authorization: str = Header(alias="Authorization"),
) -> dict:
    log_info(logger, "get_my_access called", document_id=document_id)
    try:
        token = auth_service.parse_bearer_token(authorization)
        profile_payload = await auth_service.get_user_profile_from_token(token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    user = UserProfile.model_validate(profile_payload)

    try:
        summary = await get_document_access_summary(document_id, user.id)
        log_debug(logger, "get_my_access resolved", document_id=document_id, user_id=user.id, summary=summary)
        return summary
    except DocumentNotFoundError as exc:
        log_warning(logger, "get_my_access failed: document not found", document_id=document_id, user_id=user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

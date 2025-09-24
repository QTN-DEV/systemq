"""Document routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query, status

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


@router.get(
    "/",
    response_model=list[DocumentResponse],
    summary="List documents by parent",
    response_description="Documents that belong to the requested parent folder.",
)
async def list_documents(
    parent_id: Query(description="Parent folder identifier. Omit for root documents."),
) -> list[DocumentResponse]:
    documents = await document_service.get_documents_by_parent(parent_id)
    return [DocumentResponse.model_validate(doc) for doc in documents]


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Retrieve a document",
    response_description="Full metadata for the requested document.",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Document not found."},
    },
)
async def get_document(document_id: str) -> DocumentResponse:
    try:
        document = await document_service.get_document_payload(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return DocumentResponse.model_validate(document)


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
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Document not found."},
    },
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
    search: Query(description="Filter values by substring."),
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
    search: Query(description="Filter values by substring."),
) -> DistinctValuesResponse:
    values = await document_service.get_document_categories(search)
    return DistinctValuesResponse(values=values)


@router.post(
    "/",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a document",
    response_description="Newly created document metadata.",
    responses={
        status.HTTP_409_CONFLICT: {"description": "Document with that identifier already exists."},
    },
)
async def create_document(
    payload: DocumentCreate,
    authorization: Header(),
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
            payload.model_dump(),
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
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Document or parent not found."},
        status.HTTP_400_BAD_REQUEST: {"description": "Invalid update payload."},
    },
)
async def update_document(document_id: str, payload: DocumentUpdate) -> DocumentResponse:
    try:
        document = await document_service.update_document(
            document_id,
            payload.model_dump(exclude_unset=True),
        )
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return DocumentResponse.model_validate(document)


@router.delete(
    "/{document_id}",
    response_model=MessageResponse,
    summary="Soft delete a document",
    response_description="Confirmation that the document was marked as deleted.",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Document not found."},
    },
)
async def delete_document(document_id: str) -> MessageResponse:
    try:
        await document_service.delete_document(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return MessageResponse(message="Document deleted successfully.")

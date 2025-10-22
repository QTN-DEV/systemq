"""Document routes."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from beanie.operators import In, RegEx
from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException, Query, status

from app.logging_utils import get_logger
from app.models.qdrive import QDrive, QDrivePermission, QDriveSnapshot
from app.models.user import User
from app.schemas import (
    DistinctValuesResponse,
    DocumentBreadcrumbSchema,
    DocumentCreate,
    DocumentUpdate,
    ItemCountResponse,
    MessageResponse,
    UserProfile,
)
from app.services.auth import get_user_profile_from_token, parse_bearer_token

router = APIRouter(prefix="/documents", tags=["Documents"])
logger = get_logger(__name__)


# =====================
# HELPER FUNCTIONS
# =====================


def _to_object_id(id_str: str) -> ObjectId:
    """Convert string ID to ObjectId, handling validation."""
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document ID")


# =====================
# ACCESS CONTROL HELPERS
# =====================


async def _get_current_user(authorization: str) -> UserProfile:
    """Extract and validate user from authorization header."""
    try:
        token = parse_bearer_token(authorization)
        user_data = await get_user_profile_from_token(token)
        return UserProfile(**user_data)
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication"
        )


def _is_admin(user: UserProfile) -> bool:
    """Check if user is admin."""
    return user.level and user.level.lower() == "admin"


async def _get_ancestor_ids(document_id: str) -> list[str]:
    """Get all ancestor document IDs up to root."""
    ancestors = []
    current_id = document_id
    visited = set()

    while current_id:
        if current_id in visited:
            break
        visited.add(current_id)

        try:
            obj_id = ObjectId(current_id)
        except Exception:
            break

        doc = await QDrive.find_one(QDrive.id == obj_id)
        if not doc:
            break

        ancestors.append(str(doc.id))
        current_id = doc.parent_id

    return ancestors


async def _can_view_document(doc: QDrive, user: UserProfile) -> bool:
    """Check if user can view a document."""
    if _is_admin(user):
        return True

    # Owner can view
    if doc.creator_id == user.id:
        return True

    # Check document and all ancestors
    ancestor_ids = await _get_ancestor_ids(str(doc.id))
    documents = await QDrive.find(In(QDrive.id, ancestor_ids)).to_list()

    for ancestor in documents:
        for perm in ancestor.permissions:
            # Direct user permission
            if perm.user_id == user.id:
                return True
            # Division permission
            if perm.division_id and perm.division_id == user.division:
                return True

    return False


async def _can_edit_document(doc: QDrive, user: UserProfile) -> bool:
    """Check if user can edit a document."""
    if _is_admin(user):
        return True

    # Owner can edit
    if doc.creator_id == user.id:
        return True

    # Check document and all ancestors for editor permission
    ancestor_ids = await _get_ancestor_ids(str(doc.id))
    documents = await QDrive.find(In(QDrive.id, ancestor_ids)).to_list()

    for ancestor in documents:
        for perm in ancestor.permissions:
            if perm.permission != "editor":
                continue
            # Direct user permission
            if perm.user_id == user.id:
                return True
            # Division permission
            if perm.division_id and perm.division_id == user.division:
                return True

    return False


async def _can_delete_document(doc: QDrive, user: UserProfile) -> bool:
    """Check if user can delete a document (owner only)."""
    if _is_admin(user):
        return True

    # Only owner or ancestor owner can delete
    if doc.creator_id == user.id:
        return True

    # Check if user is owner of any ancestor
    ancestor_ids = await _get_ancestor_ids(str(doc.id))
    if str(doc.id) in ancestor_ids:
        ancestor_ids.remove(str(doc.id))

    if not ancestor_ids:
        return False

    documents = await QDrive.find(In(QDrive.id, ancestor_ids)).to_list()
    for ancestor in documents:
        if ancestor.creator_id == user.id:
            return True

    return False


async def _serialize_document(doc: QDrive) -> dict[str, Any]:
    """Serialize a document with resolved permissions."""
    permissions = []
    for perm in doc.permissions:
        permissions.append(await perm.resolve_fk())

    return {
        "id": str(doc.id),
        "name": doc.name,
        "type": doc.type,
        "creator_id": doc.creator_id,
        "category": doc.category,
        "parent_id": doc.parent_id,
        "content": doc.content,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
        "deleted_at": doc.deleted_at,
        "permissions": permissions,
    }


@router.get(
    "/",
    summary="List documents by parent",
    response_description="Documents that belong to the requested parent folder.",
)
async def list_documents(
    parent_id: str | None = Query(None),
    authorization: str = Header(alias="Authorization"),
):
    """
    List documents by parent folder, filtering by user access.

    User who can ls a folder must be one of:
    - Owner of the folder or any ancestor
    - Viewer of the folder or any ancestor
    - In a division of a viewer of the folder or any ancestor
    - Admin
    """
    user = await _get_current_user(authorization)

    # Find all documents with the given parent_id (or None for root)
    query = QDrive.find(
        QDrive.parent_id == parent_id, QDrive.deleted_at == None  # noqa: E711
    )
    documents = await query.to_list()

    # Filter by access
    result = []
    for doc in documents:
        if await _can_view_document(doc, user):
            result.append(await _serialize_document(doc))

    return result


# -----------------------------
# NEW: Search across accessible
# -----------------------------
@router.get(
    "/search",
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
):
    """
    Find docs/folders by name/category (case-insensitive) that the caller can view.
    Definition of user can view a document:
    - Owner of the document or one of its ancestors
    - Viewer/editor of the document or one of its ancestors
    - In a division of an viewer/editor of the document or one of its ancestors
    - Admin
    """
    user = await _get_current_user(authorization)

    # Build query - search in name or category using case-insensitive regex
    import re

    all_docs = await QDrive.find(QDrive.deleted_at == None).to_list()  # noqa: E711

    # Filter by search term
    pattern = re.compile(q, re.IGNORECASE)
    documents = [
        doc
        for doc in all_docs
        if (doc.name and pattern.search(doc.name))
        or (doc.category and pattern.search(doc.category))
    ]

    # Filter by types if provided
    if types:
        documents = [doc for doc in documents if doc.type in types]

    # Filter by access
    accessible = []
    for doc in documents:
        if await _can_view_document(doc, user):
            accessible.append(await _serialize_document(doc))

    # Apply pagination
    total = len(accessible)
    paginated = accessible[offset : offset + limit]

    return {"items": paginated, "total": total, "offset": offset, "limit": limit}


# -----------------------------


@router.get(
    "/types",
    response_model=DistinctValuesResponse,
    summary="List document types",
    response_description="Distinct document types recorded in the repository.",
)
async def get_document_types(
    search: str | None = Query(None),
) -> DistinctValuesResponse:
    """Return distinct types. Filter by search if provided."""
    query_filter = QDrive.deleted_at == None  # noqa: E711

    if search:
        query_filter = query_filter & (RegEx(pattern=search, options="i") == QDrive.type)

    documents = await QDrive.find(query_filter).to_list()
    types = sorted({doc.type for doc in documents if doc.type})

    return DistinctValuesResponse(values=types)


@router.get(
    "/categories",
    response_model=DistinctValuesResponse,
    summary="List document categories",
    response_description="Distinct document categories recorded in the repository.",
)
async def get_document_categories(
    search: str | None = Query(None),
) -> DistinctValuesResponse:
    """Return distinct categories. Filter by search if provided."""
    query_filter = QDrive.deleted_at == None  # noqa: E711

    if search:
        query_filter = query_filter & (
            RegEx(pattern=search, options="i") == QDrive.category
        )

    documents = await QDrive.find(query_filter).to_list()
    categories = sorted({doc.category for doc in documents if doc.category})

    return DistinctValuesResponse(values=categories)


@router.get(
    "/{document_id}",
    summary="Retrieve a document",
    response_description="Full metadata for the requested document.",
)
async def get_document(
    document_id: str,
    authorization: str = Header(alias="Authorization"),
):
    """
    Retrieve a document by its ID.
    Definition of user can get a document:
    - Owner of the document or one of its ancestors
    - Viewer/editor of the document or one of its ancestors
    - In a division of an viewer/editor of the document or one of its ancestors
    - Admin
    """
    user = await _get_current_user(authorization)
    doc_id = _to_object_id(document_id)

    doc = await QDrive.find_one(
        QDrive.id == doc_id, QDrive.deleted_at == None  # noqa: E711
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not await _can_view_document(doc, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return await _serialize_document(doc)


@router.get(
    "/{document_id}/item-count",
    summary="Count immediate children",
    response_description="Number of active items directly under the folder.",
)
async def get_item_count(document_id: str):
    """
    Count immediate children of a document.
    """
    doc_id = _to_object_id(document_id)
    item_count = await QDrive.find(QDrive.parent_id == str(doc_id)).count()

    return ItemCountResponse(count=item_count)


@router.get(
    "/{document_id}/path-ids",
    response_model=list[str],
    summary="Resolve folder ancestor identifiers",
    response_description="Ordered identifiers of ancestor folders ending with the requested id.",
)
async def get_folder_path_ids(document_id: str) -> list[str]:
    """Return array of ids from Root till this document."""
    doc_id = _to_object_id(document_id)
    path = []
    current_id = str(doc_id)
    visited = set()

    while current_id:
        if current_id in visited:
            break
        visited.add(current_id)

        try:
            obj_id = ObjectId(current_id)
        except Exception:
            break

        doc = await QDrive.find_one(QDrive.id == obj_id)
        if not doc:
            break

        path.insert(0, str(doc.id))
        current_id = doc.parent_id

    return path


@router.get(
    "/{document_id}/breadcrumbs",
    response_model=list[DocumentBreadcrumbSchema],
    summary="Build breadcrumb trail",
    response_description="Breadcrumb entries from the root to the requested folder.",
)
async def get_breadcrumbs(document_id: str) -> list[DocumentBreadcrumbSchema]:
    """Return breadcrumbs from Root till this document."""
    doc_id = _to_object_id(document_id)
    breadcrumbs = []
    current_id = str(doc_id)
    visited = set()

    while current_id:
        if current_id in visited:
            break
        visited.add(current_id)

        try:
            obj_id = ObjectId(current_id)
        except Exception:
            break

        doc = await QDrive.find_one(QDrive.id == obj_id)
        if not doc:
            break

        # Build path for this document
        path = []
        temp_id = current_id
        temp_visited = set()

        while temp_id:
            if temp_id in temp_visited:
                break
            temp_visited.add(temp_id)

            try:
                temp_obj_id = ObjectId(temp_id)
            except Exception:
                break

            temp_doc = await QDrive.find_one(QDrive.id == temp_obj_id)
            if not temp_doc:
                break

            path.insert(0, temp_doc.name)
            temp_id = temp_doc.parent_id

        breadcrumbs.insert(
            0,
            DocumentBreadcrumbSchema(
                id=str(doc.id),
                name=doc.name,
                path=path,
            ),
        )

        current_id = doc.parent_id

    return breadcrumbs








@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Create a document",
)
async def create_document(
    payload: DocumentCreate,
    authorization: str = Header(alias="Authorization"),
):
    """
    Create a document.
    Definition of user can create a document:
    - Owner/Editor/Viewer of the parent folder
    - In a division of an owner/editor/viewer of the parent folder
    - Admin
    """
    user = await _get_current_user(authorization)

    # Check parent access if parent_id is provided
    if payload.parent_id:
        parent = await QDrive.find_one(
            QDrive.id == payload.parent_id, QDrive.deleted_at == None  # noqa: E711
        )
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Parent folder not found"
            )

        if not await _can_view_document(parent, user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to parent folder",
            )

    # Create document
    permissions = [
        QDrivePermission(
            user_id=perm.user_id,
            division_id=perm.division_id,
            permission=perm.permission,
        )
        for perm in payload.permissions
    ]

    doc = QDrive(
        name=payload.name,
        type=payload.type,
        creator_id=user.id,
        category=payload.category,
        parent_id=payload.parent_id,
        content=payload.content,
        permissions=permissions,
    )
    await doc.insert()

    return await _serialize_document(doc)


@router.patch(
    "/{document_id}",
    summary="Update document metadata",
    response_description="Updated document representation after applying changes.",
)
async def update_document(
    document_id: str,
    payload: DocumentUpdate,
    authorization: str = Header(alias="Authorization"),
    commit: bool = Query(False),
):
    """
    Update document metadata.
    Definition of user can update a document:
    - Owner/Editor/Viewer of the document or one of its ancestors
    - In a division of an owner/editor/viewer of the document or one of its ancestors
    - Admin
    """
    user = await _get_current_user(authorization)
    doc_id = _to_object_id(document_id)

    doc = await QDrive.find_one(
        QDrive.id == doc_id, QDrive.deleted_at == None  # noqa: E711
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not await _can_edit_document(doc, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Create snapshot if commit is True
    if commit:
        snapshot = QDriveSnapshot(
            qdrive_id=str(doc.id),
            qdrive=doc,
            changer_id=user.id,
        )
        await snapshot.insert()

    # Update fields
    if payload.name is not None:
        doc.name = payload.name
    if payload.category is not None:
        doc.category = payload.category
    if payload.content is not None:
        doc.content = payload.content
    if payload.permissions is not None:
        doc.permissions = [
            QDrivePermission(
                user_id=perm.user_id,
                division_id=perm.division_id,
                permission=perm.permission,
            )
            for perm in payload.permissions
        ]

    doc.updated_at = datetime.now(UTC)
    await doc.save()

    return await _serialize_document(doc)


@router.get(
    "/{document_id}/history",
    summary="Get edit history (coalesced)",
)
async def get_edit_history(document_id: str, authorization: str = Header(alias="Authorization")):
    """
    Get edit history of a document.
    Definition of user can view edit history of a document:
    - Owner/Editor of the document or one of its ancestors
    - In a division of an owner/editor of the document or one of its ancestors
    - Admin
    """
    user = await _get_current_user(authorization)
    doc_id = _to_object_id(document_id)

    doc = await QDrive.find_one(
        QDrive.id == doc_id, QDrive.deleted_at == None  # noqa: E711
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not await _can_edit_document(doc, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Get snapshots for this document
    snapshots = await QDriveSnapshot.find(
        QDriveSnapshot.qdrive_id == str(doc_id)
    ).sort("-created_at").to_list()

    result = []
    for snapshot in snapshots:
        changer = await User.find_one(User.id == snapshot.changer_id)
        result.append(
            {
                "id": str(snapshot.id),
                "created_at": snapshot.created_at,
                "changer": {
                    "id": changer.employee_id or str(changer.id) if changer else None,
                    "name": changer.name if changer else "Unknown",
                    "email": changer.email if changer else None,
                } if changer else None,
                "snapshot": await _serialize_document(snapshot.qdrive),
            }
        )

    return result


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
    """
    Soft delete a document.
    Definition of user can delete a document:
    - Owner of the document or one of its ancestors
    - In a division of an owner of the document or one of its ancestors
    - Admin
    """
    user = await _get_current_user(authorization)
    doc_id = _to_object_id(document_id)

    doc = await QDrive.find_one(
        QDrive.id == doc_id, QDrive.deleted_at == None  # noqa: E711
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not await _can_delete_document(doc, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Create snapshot before deletion
    snapshot = QDriveSnapshot(
        qdrive_id=str(doc.id),
        qdrive=doc,
        changer_id=user.id,
    )
    await snapshot.insert()

    # Soft delete
    doc.deleted_at = datetime.now(UTC)
    await doc.save()

    return MessageResponse(message="Document deleted successfully")


@router.get(
    "/{document_id}/access",
    summary="Get effective access for current user",
    response_description="Effective can_view/can_edit considering direct/inherited permissions.",
)
async def get_my_access(
    document_id: str,
    authorization: str = Header(alias="Authorization"),
) -> dict:
    """Get effective access for current user.
    Owner: Owner of this file
    Editor: One of the following:
    - Editor of this file
    - Editor of one of its ancestors
    - In a division of an editor of this file
    - In a division of an editor of one of its ancestors
    Viewer: One of the following:
    - Viewer of this file
    - Viewer of one of its ancestors
    - In a division of a viewer of this file
    - In a division of a viewer of one of its ancestors
    Admin: Admin
    """
    user = await _get_current_user(authorization)
    doc_id = _to_object_id(document_id)

    doc = await QDrive.find_one(
        QDrive.id == doc_id, QDrive.deleted_at == None  # noqa: E711
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    can_view = await _can_view_document(doc, user)
    can_edit = await _can_edit_document(doc, user)
    can_delete = await _can_delete_document(doc, user)
    is_owner = doc.creator_id == user.id

    return {
        "can_view": can_view,
        "can_edit": can_edit,
        "can_delete": can_delete,
        "is_owner": is_owner,
    }

"""Document service."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from app.models.document import DocumentHistory, DocumentItem, DocumentOwner
from app.schemas.document import DocumentCreate


class DocumentAlreadyExistsError(ValueError):
    pass


class DocumentNotFoundError(ValueError):
    pass


ACTIVE_DOCUMENT = {"is_deleted": False}


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _serialize_document(document: DocumentItem) -> dict[str, Any]:
    return {
        "id": document.document_id,
        "name": document.name,
        "title": document.title,
        "type": document.type,
        "owned_by": document.owned_by.model_dump(),
        "category": document.category,
        "status": document.status,
        "date_created": document.date_created.isoformat(),
        "last_modified": document.last_modified.isoformat(),
        "size": document.size,
        "item_count": document.item_count,
        "parent_id": document.parent_id,
        "path": document.path,
        "shared": document.shared,
        "share_url": document.share_url,
        "content": document.content,
    }


async def _record_history(
    document: DocumentItem,
    action: Literal["created", "updated", "deleted"],
    changes: dict[str, Any],
    editor_id: str | None = None,
) -> None:
    revision = await DocumentHistory.find(
        DocumentHistory.document_id == document.document_id
    ).count()
    history_entry = DocumentHistory(
        document_id=document.document_id,
        revision=revision + 1,
        action=action,
        changes=changes,
        snapshot=_serialize_document(document),
        editor_id=editor_id,
    )
    await history_entry.insert()


async def _refresh_item_count(folder_id: str | None) -> None:
    if not folder_id:
        return
    folder = await DocumentItem.find_one(
        DocumentItem.document_id == folder_id,
        ACTIVE_DOCUMENT,
    )
    if folder is None:
        return
    count = await DocumentItem.find(
        DocumentItem.parent_id == folder_id,
        ACTIVE_DOCUMENT,
    ).count()
    folder.item_count = count
    folder.updated_at = _utcnow()
    await folder.save()


async def _apply_path(document: DocumentItem) -> None:
    if document.parent_id:
        parent = await DocumentItem.find_one(
            DocumentItem.document_id == document.parent_id,
            ACTIVE_DOCUMENT,
        )
        if parent is None:
            raise DocumentNotFoundError(f"Parent '{document.parent_id}' not found")
        document.path = parent.path + [parent.name]
    else:
        document.path = []


async def _refresh_descendant_paths(document: DocumentItem) -> None:
    children = await DocumentItem.find(
        DocumentItem.parent_id == document.document_id,
        ACTIVE_DOCUMENT,
    ).to_list()
    for child in children:
        child.path = document.path + [document.name]
        await child.save()
        await _refresh_descendant_paths(child)


async def get_documents_by_parent(parent_id: str | None) -> list[dict[str, Any]]:
    if parent_id is None:
        query = DocumentItem.find(
            DocumentItem.parent_id == None,  # noqa: E711
            ACTIVE_DOCUMENT,
        )
    else:
        query = DocumentItem.find(
            DocumentItem.parent_id == parent_id,
            ACTIVE_DOCUMENT,
        )
    documents = await query.sort(DocumentItem.name).to_list()
    return [_serialize_document(document) for document in documents]


async def get_item_count(folder_id: str) -> int:
    return await DocumentItem.find(
        DocumentItem.parent_id == folder_id,
        ACTIVE_DOCUMENT,
    ).count()


async def get_document_by_id(document_id: str) -> DocumentItem:
    document = await DocumentItem.find_one(
        DocumentItem.document_id == document_id,
        ACTIVE_DOCUMENT,
    )
    if document is None:
        raise DocumentNotFoundError(f"Document '{document_id}' not found")
    return document


async def get_document_payload(document_id: str) -> dict[str, Any]:
    document = await get_document_by_id(document_id)
    return _serialize_document(document)


async def get_folder_path_ids(folder_id: str) -> list[str]:
    document = await get_document_by_id(folder_id)
    path: list[str] = []
    current = document
    while current.parent_id:
        path.insert(0, current.parent_id)
        current = await get_document_by_id(current.parent_id)
    path.append(folder_id)
    return path


async def build_breadcrumbs(current_folder_id: str | None) -> list[dict[str, Any]]:
    breadcrumbs = [{"id": "root", "name": "Documents", "path": []}]
    if current_folder_id is None:
        return breadcrumbs
    try:
        current = await get_document_by_id(current_folder_id)
    except DocumentNotFoundError:
        return breadcrumbs

    ancestors: list[DocumentItem] = []
    walker = current
    while walker.parent_id:
        parent = await DocumentItem.find_one(
            DocumentItem.document_id == walker.parent_id,
            ACTIVE_DOCUMENT,
        )
        if parent is None:
            break
        ancestors.insert(0, parent)
        walker = parent

    for ancestor in ancestors + [current]:
        breadcrumbs.append(
            {
                "id": ancestor.document_id,
                "name": ancestor.name,
                "path": ancestor.path,
            },
        )
    return breadcrumbs


async def get_distinct_types(search: str | None = None) -> list[str]:
    values = await DocumentItem.find(ACTIVE_DOCUMENT).distinct("type")
    filtered = [value for value in values if isinstance(value, str)]
    if search:
        search_lower = search.lower()
        filtered = [value for value in filtered if search_lower in value.lower()]
    return sorted(set(filtered))


async def get_distinct_categories(search: str | None = None) -> list[str]:
    values = await DocumentItem.find(ACTIVE_DOCUMENT).distinct("category")
    filtered = [value for value in values if isinstance(value, str)]
    if search:
        search_lower = search.lower()
        filtered = [value for value in filtered if search_lower in value.lower()]
        if not filtered:
            return [search]
    return sorted(set(filtered))


async def create_document(payload: DocumentCreate, owner: dict[str, Any]) -> dict[str, Any]:
    document_id = payload.name.lower().replace(" ", "-").replace("/", "--")
    existing = await DocumentItem.find(
        {
            "id": document_id,
            "parent_id": payload.parent_id,
            "deleted_at": None,
        },
    )
    if existing is not None:
        raise DocumentAlreadyExistsError(f"Document '{document_id}' already exists")

    document = DocumentItem(
        document_id=document_id,
        name=payload.name,
        type=payload.type,
        owned_by=DocumentOwner(**owner),
        parent_id=payload.parent_id,
    )

    await _apply_path(document)
    await document.insert()

    await _record_history(
        document,
        "created",
        {"new": _serialize_document(document)},
        editor_id=owner.get("id"),
    )
    await _refresh_item_count(document.parent_id)

    return _serialize_document(document)


async def update_document(document_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    document = await get_document_by_id(document_id)

    changes: dict[str, Any] = {}
    old_parent_id = document.parent_id

    if "name" in payload and payload["name"] and payload["name"] != document.name:
        changes["name"] = {"old": document.name, "new": payload["name"]}
        document.name = payload["name"]
    if "title" in payload and payload["title"] != document.title:
        changes["title"] = {"old": document.title, "new": payload["title"]}
        document.title = payload["title"]
    if "category" in payload and payload["category"] != document.category:
        changes["category"] = {"old": document.category, "new": payload["category"]}
        document.category = payload["category"]
    if "status" in payload and payload["status"] and payload["status"] != document.status:
        changes["status"] = {"old": document.status, "new": payload["status"]}
        document.status = payload["status"]
    if (
        "shared" in payload
        and payload["shared"] is not None
        and payload["shared"] != document.shared
    ):
        changes["shared"] = {"old": document.shared, "new": payload["shared"]}
        document.shared = payload["shared"]
    if "share_url" in payload and payload["share_url"] != document.share_url:
        changes["share_url"] = {"old": document.share_url, "new": payload["share_url"]}
        document.share_url = payload["share_url"]
    if "content" in payload and payload["content"] != document.content:
        changes["content"] = {"old": document.content, "new": payload["content"]}
        document.content = payload["content"]

    if "parent_id" in payload and payload["parent_id"] != document.parent_id:
        new_parent_id = payload["parent_id"]
        if new_parent_id == document.document_id:
            raise ValueError("Document cannot be its own parent")
        if new_parent_id:
            parent = await DocumentItem.find_one(
                DocumentItem.document_id == new_parent_id,
                ACTIVE_DOCUMENT,
            )
            if parent is None:
                raise DocumentNotFoundError(f"Parent '{new_parent_id}' not found")
        changes["parent_id"] = {"old": document.parent_id, "new": new_parent_id}
        document.parent_id = new_parent_id

    if not changes:
        return _serialize_document(document)

    await _apply_path(document)
    document.last_modified = _utcnow()
    document.updated_at = document.last_modified
    await document.save()

    if document.type == "folder" or "parent_id" in changes:
        await _refresh_descendant_paths(document)

    await _record_history(document, "updated", changes)

    if "parent_id" in changes:
        await _refresh_item_count(old_parent_id)
        await _refresh_item_count(document.parent_id)

    return _serialize_document(document)


async def _soft_delete(document: DocumentItem) -> None:
    document.is_deleted = True
    document.deleted_at = _utcnow()
    document.last_modified = document.deleted_at
    document.updated_at = document.deleted_at
    await document.save()

    children = await DocumentItem.find(
        DocumentItem.parent_id == document.document_id,
        ACTIVE_DOCUMENT,
    ).to_list()
    for child in children:
        await _soft_delete(child)


async def delete_document(document_id: str) -> dict[str, Any]:
    document = await get_document_by_id(document_id)
    await _soft_delete(document)
    await _record_history(document, "deleted", {"deleted": True})
    await _refresh_item_count(document.parent_id)
    return _serialize_document(document)


async def get_document_types(search: str | None = None) -> list[str]:
    return await get_distinct_types(search)


async def get_document_categories(search: str | None = None) -> list[str]:
    return await get_distinct_categories(search)

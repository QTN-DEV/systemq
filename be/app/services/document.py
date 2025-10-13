"""Document service."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal, Iterable

from app.models.document import (
    DocumentBlock,
    DocumentHistory,
    DocumentItem,
    DocumentOwner,
    DocumentUserRef,
    EditHistoryEvent,
)
from app.models.user import User  # NEW
from app.schemas.document import DocumentCreate


class DocumentAlreadyExistsError(ValueError):
    pass


class DocumentNotFoundError(ValueError):
    pass


ACTIVE_DOCUMENT = {"is_deleted": False}


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _normalize_content(document: DocumentItem) -> None:
    """Ensure content is never null - convert to empty array if needed."""
    if document.content is None:
        document.content = []


def _serialize_document(document: DocumentItem) -> dict[str, Any]:
    return {
        "id": document.document_id,
        "name": document.name,
        "type": document.type,
        "owned_by": document.owned_by.model_dump(),
        "category": document.category,
        "status": document.status,
        "date_created": document.date_created.isoformat(),
        "last_modified": document.last_modified.isoformat(),
        "last_modified_by": (
            document.last_modified_by.model_dump()
            if isinstance(document.last_modified_by, DocumentUserRef)
            else (document.last_modified_by if document.last_modified_by else None)
        ),
        "size": document.size,
        "item_count": document.item_count,
        "parent_id": document.parent_id,
        "path": document.path,
        "shared": document.shared,
        "share_url": document.share_url,
        "content": document.content if document.content is not None else [],
        "user_permissions": [perm.model_dump() for perm in document.user_permissions],
        "division_permissions": [perm.model_dump() for perm in document.division_permissions],
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


def _uniq_by_id(items: Iterable[DocumentItem]) -> list[DocumentItem]:
    seen: set[str] = set()
    out: list[DocumentItem] = []
    for it in items:
        if it.document_id not in seen:
            seen.add(it.document_id)
            out.append(it)
    return out


async def get_documents_by_parent(
    parent_id: str | None, user_id: str | None = None
) -> list[dict[str, Any]]:
    """
    - Jika parent_id None: tampilkan anak-anak root YANG diizinkan,
      lalu suntikkan juga dokumen/folder yang user punya AKSES LANGSUNG
      (owner/user/division) tetapi tidak mendapatkan akses dari ancestor folder (agar tidak duplikat).
    - Jika parent_id ada: tampilkan anak-anak folder itu seperti biasa, disaring oleh access checker.
    """
    from app.services.document_permission import (
        check_document_access,
        has_direct_document_access,
        has_ancestor_folder_access,
    )

    # Base query: children of the requested parent (or root children)
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

    # Access-filter untuk listing normal
    if user_id:
        from app.services.document_permission import (
            check_document_access,
            has_direct_document_access,
            has_ancestor_folder_access,
        )

        filtered: list[DocumentItem] = []
        for document in documents:
            if await check_document_access(document.document_id, user_id, "viewer"):
                filtered.append(document)
        documents = filtered

        # === Virtual root injection (hanya saat root listing) ===
        if parent_id is None:
            user = await User.find_one(User.employee_id == user_id)
            if user and user.is_active:
                virtuals: list[DocumentItem] = []

                # Cari dokumen/folder non-root yang user adalah owner OR
                # punya direct user permission OR punya division permission.
                # (Kami mencari parent_id != None agar memang bukan already-root)
                # print("user:", user_id, user.division)
                candidates = await DocumentItem.find(
                    {
                        "is_deleted": False,
                        "parent_id": {"$ne": None},
                        "$or": [
                            {"owned_by.id": user_id},
                            {"user_permissions": {"$elemMatch": {"user_id": user_id}}},
                            {
                                "division_permissions": {
                                    "$elemMatch": {
                                        "division": user.division if user.division else "__NO_DIV__"
                                    }
                                }
                            },
                        ],
                    }
                ).to_list()

                # Dedup candidates (by document_id)
                unique_candidates = _uniq_by_id(candidates)

                # print(unique_candidates)

                # Keep only those with *direct* access and WITHOUT ancestor-folder inheritance.
                # This selects both files and folders that were shared directly to the user.
                for doc in unique_candidates:
                    direct_ok = await has_direct_document_access(doc.document_id, user_id, "viewer")
                    if not direct_ok:
                        continue
                    # if the doc is already visible via some shared ancestor folder, skip it
                    inherited_ok = await has_ancestor_folder_access(
                        doc.document_id, user_id, "viewer"
                    )
                    if inherited_ok:
                        continue
                    # dedupe against documents already in the listing
                    if all(d.document_id != doc.document_id for d in documents):
                        virtuals.append(doc)

                if virtuals:
                    # append virtuals and dedup in case of overlap
                    documents = _uniq_by_id(documents + virtuals)

    # Normalize & serialize
    for document in documents:
        _normalize_content(document)
    # Sort by name for stable order
    documents.sort(key=lambda d: (d.name or "").lower())
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
    _normalize_content(document)
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
    existing = await DocumentItem.find_one(
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

    # initialize last_modified_by as owner on create
    document.last_modified_by = DocumentUserRef(id=owner["id"], name=owner["name"])  # type: ignore[index]
    await document.save()

    await _record_history(
        document,
        "created",
        {"new": _serialize_document(document)},
        editor_id=owner.get("id"),
    )
    await _refresh_item_count(document.parent_id)

    return _serialize_document(document)


COALESCE_MINUTES = 10


async def record_edit_history(document_id: str, editor: dict[str, str]) -> None:
    """Coalesce edit events within COALESCE_MINUTES for the same editor and doc.

    Always updates the document's last_modified and last_modified_by.
    """
    now = _utcnow()
    cutoff_ts = now.timestamp() - COALESCE_MINUTES * 60
    cutoff = datetime.fromtimestamp(cutoff_ts, tz=now.tzinfo)
    # Beanie/Mongo: query last event by at desc
    last = await EditHistoryEvent.find({"document_id": document_id}).sort("-at").first_or_none()

    if last and last.editor_id == editor["id"]:
        last_at = last.at
        if last_at.tzinfo is None:
            last_at = last_at.replace(tzinfo=UTC)
        if last_at >= cutoff:
            # update timestamp of last event
            last.at = now
            await last.save()
        else:
            event = EditHistoryEvent(
                document_id=document_id,
                editor_id=editor["id"],
                editor_name=editor["name"],
                at=now,
            )
            await event.insert()
    else:
        event = EditHistoryEvent(
            document_id=document_id,
            editor_id=editor["id"],
            editor_name=editor["name"],
            at=now,
        )
        await event.insert()

    # Update document metadata
    document = await get_document_by_id(document_id)
    document.last_modified = now
    document.last_modified_by = DocumentUserRef(id=editor["id"], name=editor["name"])  # type: ignore[arg-type]
    document.updated_at = now
    await document.save()


async def get_edit_history(document_id: str) -> list[dict[str, Any]]:
    events = (
        await EditHistoryEvent.find(EditHistoryEvent.document_id == document_id)
        .sort("-at")
        .to_list()
    )
    return [
        {"editor": {"id": e.editor_id, "name": e.editor_name}, "at": e.at.isoformat()}
        for e in events
    ]


async def update_document(
    document_id: str, payload: dict[str, Any], editor: dict[str, str] | None = None
) -> dict[str, Any]:
    document = await get_document_by_id(document_id)

    changes: dict[str, Any] = {}
    old_parent_id = document.parent_id

    if "name" in payload and payload["name"] and payload["name"] != document.name:
        changes["name"] = {"old": document.name, "new": payload["name"]}
        document.name = payload["name"]
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
        new_content = payload["content"] if payload["content"] is not None else []
        changes["content"] = {"old": document.content, "new": new_content}
        document.content = new_content

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
    if editor is not None:
        document.last_modified_by = DocumentUserRef(id=editor["id"], name=editor["name"])  # type: ignore[arg-type]
    await document.save()

    if document.type == "folder" or "parent_id" in changes:
        await _refresh_descendant_paths(document)

    await _record_history(document, "updated", changes)

    # Coalesced edit event only for real edits and only when editor is known
    if editor is not None:
        await record_edit_history(document.document_id, editor)

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

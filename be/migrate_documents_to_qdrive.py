"""Migration script to convert old documents to QDrive format and insert to DB."""

import asyncio
import json
from datetime import UTC, datetime

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models import QDrive
from constants import MONGODB_DATABASE, MONGODB_URI


def parse_mongo_date(date_obj):
    """Parse MongoDB date object."""
    if isinstance(date_obj, dict) and "$date" in date_obj:
        return datetime.fromisoformat(date_obj["$date"].replace("Z", "+00:00"))
    return None


def map_old_document_to_qdrive(old_doc, parent_mapping):
    """Map old document structure to QDrive model."""
    # Extract content from content array
    content = None
    if old_doc.get("content"):
        content_parts = [item.get("content", "") for item in old_doc["content"]]
        content = "<br/>".join(content_parts)

    # Map parent_id if it exists in the old document
    old_parent_id = old_doc.get("parent_id")
    mapped_parent_id = None
    if old_parent_id:
        mapped_parent_id = parent_mapping.get(old_parent_id)

    qdrive = QDrive(
        name=old_doc.get("name", ""),
        type=old_doc.get("type", "file"),
        creator_id=old_doc.get("owned_by", {}).get("id", ""),
        category=old_doc.get("category"),
        parent_id=mapped_parent_id,
        content=content,
        created_at=parse_mongo_date(old_doc.get("date_created")),
        updated_at=parse_mongo_date(old_doc.get("last_modified")),
        deleted_at=(
            None if old_doc.get("status") == "active" else datetime.now(UTC)
        ),
        permissions=[],
    )

    return qdrive


async def check_integrity(collection):
    """Check integrity of parent_id references."""
    all_docs = await collection.find({}).to_list(None)
    all_ids = {str(doc["_id"]) for doc in all_docs}
    issues = []

    for doc in all_docs:
        parent_id = doc.get("parent_id")
        if parent_id and parent_id not in all_ids:
            issues.append({
                "doc_id": str(doc["_id"]),
                "doc_name": doc["name"],
                "invalid_parent_id": parent_id,
            })

    return issues


async def migrate_documents(input_file):
    """Migrate all documents from old format to QDrive in database."""
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]

    # Initialize Beanie
    await init_beanie(database=db, document_models=[QDrive])

    collection = db["qdrives"]

    with open(input_file, "r") as f:
        old_documents = json.load(f)

    # First pass: Create all folders and build parent mapping
    parent_mapping = {}  # Maps old_id -> new MongoDB _id (as string)
    folders = []
    files = []

    # Separate folders and files
    for old_doc in old_documents:
        if old_doc.get("type") == "folder":
            folders.append(old_doc)
        else:
            files.append(old_doc)

    # Create folders first (in case folders have parent folders)
    # Sort folders by parent_id (None first to handle hierarchy)
    folders_sorted = sorted(
        folders,
        key=lambda x: (x.get("parent_id") is not None, x.get("parent_id") or ""),
    )

    folder_count = 0
    file_count = 0

    # Process folders first
    for old_doc in folders_sorted:
        qdrive_doc = map_old_document_to_qdrive(old_doc, parent_mapping)

        # Insert into database using Beanie's insert method
        await qdrive_doc.insert()

        # Map old ID to new MongoDB _id
        if old_doc.get("id"):
            parent_mapping[old_doc["id"]] = str(qdrive_doc.id)

        folder_count += 1
        print(f"✅ Created folder: {qdrive_doc.name} (ID: {qdrive_doc.id})")

    # Then process files
    for old_doc in files:
        qdrive_doc = map_old_document_to_qdrive(old_doc, parent_mapping)

        # Insert into database using Beanie's insert method
        await qdrive_doc.insert()

        file_count += 1
        print(f"✅ Created file: {qdrive_doc.name} (ID: {qdrive_doc.id})")

    # Check integrity
    issues = await check_integrity(collection)

    if issues:
        print(
            f"\n⚠️  WARNING: Found {len(issues)} documents with "
            f"invalid parent_id references:"
        )
        for issue in issues:
            print(
                f"  - Document '{issue['doc_name']}' ({issue['doc_id']}) "
                f"references non-existent parent: {issue['invalid_parent_id']}"
            )
        print()

    print(f"\n✅ Migrated {folder_count + file_count} documents to database")
    print(f"   - {folder_count} folders")
    print(f"   - {file_count} files")

    if not issues:
        print("✅ All parent_id references are valid")

    client.close()


if __name__ == "__main__":
    input_file = "app/models/old_document.json"
    asyncio.run(migrate_documents(input_file))

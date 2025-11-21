"""
Migration script to convert DocumentBlock[] content to HTML format.

This script finds all documents with block-based content (content field)
and converts them to HTML format (content_html field).

The script:
1. Finds all documents with content (blocks) but no content_html
2. Converts blocks to HTML using the migration utility
3. Updates documents with the HTML content
4. Provides progress feedback and statistics
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import Any

# Add the parent directory to the path so we can import from app
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

from beanie import init_beanie

from app.models.document import DocumentBlock, DocumentItem
from app.utils.block_to_html import migrate_blocks_to_html


async def migrate_blocks_to_html_batch(
    dry_run: bool = False,
    batch_size: int = 100,
    limit: int | None = None,
) -> None:
    """
    Migrate document blocks to HTML format.

    Args:
        dry_run: If True, only show what would be migrated without making changes
        batch_size: Number of documents to process in each batch
        limit: Maximum number of documents to migrate (None = all)
    """
    # Get MongoDB URI from environment
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        print("Error: MONGODB_URI environment variable not set")
        print("Please set it in your .env file or export it")
        return

    # Get database name
    db_name = os.getenv("MONGODB_DATABASE", "systemq")

    # Connect to MongoDB
    client = AsyncIOMotorClient(mongodb_uri)
    db = client[db_name]

    # Initialize Beanie for proper model handling
    await init_beanie(
        database=db,
        document_models=[DocumentItem],
    )

    print(f"Connected to database: {db_name}")
    print(f"Mode: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE MIGRATION'}")
    print("=" * 60)

    # Find documents that need migration
    # Documents with content (blocks) but no content_html or empty content_html
    query = {
        "type": "file",  # Only migrate file documents
        "content": {"$exists": True, "$ne": None, "$ne": []},  # Has blocks
        "$or": [
            {"content_html": {"$exists": False}},  # No HTML field
            {"content_html": None},  # HTML is None
            {"content_html": ""},  # HTML is empty
        ],
    }

    documents_collection = db["documents"]
    total_count = await documents_collection.count_documents(query)

    if total_count == 0:
        print("✅ No documents found that need migration!")
        print("   All documents either have HTML content or no block content.")
        client.close()
        return

    print(f"\nFound {total_count} document(s) that need migration")
    if limit:
        print(f"   (Will process up to {limit} documents)")
        total_count = min(total_count, limit)

    # Show sample of documents to be migrated
    print("\nSample of documents to be migrated:")
    sample_count = min(5, total_count)
    sample_docs = await documents_collection.find(query).limit(sample_count).to_list(length=sample_count)

    for i, doc in enumerate(sample_docs, 1):
        doc_id = doc.get("document_id") or doc.get("_id")
        name = doc.get("name", "Unknown")
        blocks_count = len(doc.get("content", []))
        print(f"  {i}. {name} (ID: {doc_id}, {blocks_count} blocks)")

    if total_count > sample_count:
        print(f"  ... and {total_count - sample_count} more")

    print("\n" + "=" * 60)
    if not dry_run:
        response = input("Do you want to proceed with the migration? (yes/no): ")
        if response.lower() not in ["yes", "y"]:
            print("Migration cancelled.")
            client.close()
            return
    else:
        print("DRY RUN: No changes will be made")

    # Process documents in batches
    print(f"\nProcessing documents in batches of {batch_size}...")
    processed = 0
    successful = 0
    failed = 0
    errors: list[tuple[str, str]] = []

    cursor = documents_collection.find(query)
    if limit:
        cursor = cursor.limit(limit)

    batch: list[dict[str, Any]] = []
    bulk_operations: list[UpdateOne] = []

    async for doc in cursor:
        batch.append(doc)
        processed += 1

        if len(batch) >= batch_size:
            # Process batch
            batch_ops, batch_success, batch_failed, batch_errors = await process_batch(
                batch, dry_run
            )
            bulk_operations.extend(batch_ops)
            successful += batch_success
            failed += batch_failed
            errors.extend(batch_errors)

            if bulk_operations and not dry_run:
                # Execute bulk update
                try:
                    result = await documents_collection.bulk_write(bulk_operations, ordered=False)
                    print(f"  ✓ Batch: {result.modified_count} documents updated")
                except Exception as e:
                    print(f"  ✗ Batch error: {e}")
                    failed += len(bulk_operations)

                bulk_operations = []

            batch = []
            print(f"  Progress: {processed}/{total_count} documents processed")

    # Process remaining documents
    if batch:
        batch_ops, batch_success, batch_failed, batch_errors = await process_batch(
            batch, dry_run
        )
        bulk_operations.extend(batch_ops)
        successful += batch_success
        failed += batch_failed
        errors.extend(batch_errors)

    # Execute final bulk update
    if bulk_operations and not dry_run:
        try:
            result = await documents_collection.bulk_write(bulk_operations, ordered=False)
            print(f"  ✓ Final batch: {result.modified_count} documents updated")
        except Exception as e:
            print(f"  ✗ Final batch error: {e}")
            failed += len(bulk_operations)

    # Print summary
    print("\n" + "=" * 60)
    print("Migration Summary:")
    print(f"  Total documents processed: {processed}")
    print(f"  Successfully migrated: {successful}")
    print(f"  Failed: {failed}")

    if errors:
        print(f"\nErrors encountered ({len(errors)}):")
        for doc_id, error_msg in errors[:10]:  # Show first 10 errors
            print(f"  • {doc_id}: {error_msg}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more errors")

    if dry_run:
        print("\n⚠️  This was a DRY RUN. No changes were made to the database.")
        print("   Run without --dry-run to perform the actual migration.")
    else:
        print("\n✅ Migration completed!")

    client.close()


async def process_batch(
    batch: list[dict[str, Any]], dry_run: bool
) -> tuple[list[UpdateOne], int, int, list[tuple[str, str]]]:
    """Process a batch of documents and return bulk operations."""
    bulk_operations: list[UpdateOne] = []
    successful = 0
    failed = 0
    errors: list[tuple[str, str]] = []

    for doc in batch:
        doc_id = doc.get("document_id") or str(doc.get("_id", ""))
        try:
            # Parse blocks
            content_blocks = doc.get("content", [])
            if not content_blocks:
                continue

            # Convert blocks to DocumentBlock objects
            blocks: list[DocumentBlock] = []
            for block_data in content_blocks:
                try:
                    block = DocumentBlock.model_validate(block_data)
                    blocks.append(block)
                except Exception as e:
                    errors.append((doc_id, f"Invalid block: {e}"))
                    continue

            # Convert to HTML
            html_content = migrate_blocks_to_html(blocks)

            # Create update operation
            bulk_operations.append(
                UpdateOne(
                    {"_id": doc["_id"]},
                    {"$set": {"content_html": html_content}},
                )
            )
            successful += 1

        except Exception as e:
            failed += 1
            errors.append((doc_id, str(e)))

    return bulk_operations, successful, failed, errors


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Migrate document blocks to HTML format"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run without making changes (preview only)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of documents to process per batch (default: 100)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of documents to migrate (default: all)",
    )

    args = parser.parse_args()

    # Load environment variables
    from dotenv import load_dotenv

    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)

    asyncio.run(
        migrate_blocks_to_html_batch(
            dry_run=args.dry_run,
            batch_size=args.batch_size,
            limit=args.limit,
        )
    )


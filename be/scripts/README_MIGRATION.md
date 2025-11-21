# Document Blocks to HTML Migration Script

This script migrates existing documents from block-based format (`content` field with `DocumentBlock[]`) to HTML format (`content_html` field).

## Usage

### Prerequisites

1. Ensure your `.env` file is configured with:
   - `MONGODB_URI` - MongoDB connection string
   - `MONGODB_DATABASE` - Database name (default: "systemq")

2. Activate your Python virtual environment:
   ```bash
   source .venv/bin/activate  # or your venv path
   ```

### Running the Migration

#### 1. Dry Run (Recommended First Step)

Preview what will be migrated without making any changes:

```bash
python scripts/migrate_blocks_to_html.py --dry-run
```

This will:
- Show how many documents need migration
- Display a sample of documents that will be migrated
- Show what would be changed (without actually changing anything)

#### 2. Full Migration

Run the actual migration:

```bash
python scripts/migrate_blocks_to_html.py
```

The script will:
- Find all documents with blocks but no HTML
- Convert blocks to HTML
- Update documents in batches
- Show progress and statistics

#### 3. Limited Migration (Testing)

Test with a small number of documents first:

```bash
python scripts/migrate_blocks_to_html.py --limit 10
```

This will only migrate the first 10 documents.

#### 4. Custom Batch Size

Adjust batch size for performance:

```bash
python scripts/migrate_blocks_to_html.py --batch-size 50
```

Smaller batches use less memory but may be slower.

### Command Line Options

- `--dry-run`: Run without making changes (preview only)
- `--batch-size N`: Process N documents per batch (default: 100)
- `--limit N`: Only migrate first N documents (default: all)

### Example Output

```
Connected to database: systemq
Mode: DRY RUN (no changes will be made)
============================================================

Found 42 document(s) that need migration

Sample of documents to be migrated:
  1. Project Proposal (ID: doc-123, 15 blocks)
  2. Meeting Notes (ID: doc-456, 8 blocks)
  3. Requirements Doc (ID: doc-789, 23 blocks)
  ... and 39 more

============================================================
DRY RUN: No changes will be made

Processing documents in batches of 100...
  Progress: 42/42 documents processed

============================================================
Migration Summary:
  Total documents processed: 42
  Successfully migrated: 42
  Failed: 0

⚠️  This was a DRY RUN. No changes were made to the database.
   Run without --dry-run to perform the actual migration.
```

### What Gets Migrated

The script finds documents that:
- Are of type "file" (not folders)
- Have `content` field with blocks (non-empty array)
- Don't have `content_html` or have empty/null `content_html`

### Conversion Details

The migration converts:
- `paragraph` → `<p>content</p>`
- `heading1/2/3` → `<h1/h2/h3>content</h1/h2/h3>`
- `bulleted-list` → `<ul><li>items</li></ul>`
- `numbered-list` → `<ol><li>items</li></ol>`
- `quote` → `<blockquote>content</blockquote>`
- `code` → `<pre><code>content</code></pre>`
- `image` → `<img src="url" alt="..." />`
- `file` → `<a href="url">fileName</a>`
- `table` → `<table><tbody><tr><td>...</td></tr></tbody></table>`

### Safety Features

1. **Dry Run Mode**: Always test with `--dry-run` first
2. **Batch Processing**: Processes documents in batches to avoid memory issues
3. **Error Handling**: Continues processing even if individual documents fail
4. **Backward Compatible**: Old `content` field is preserved (not deleted)
5. **Idempotent**: Safe to run multiple times (only migrates documents that need it)

### Troubleshooting

**Error: MONGODB_URI not set**
- Make sure your `.env` file exists and has `MONGODB_URI` set
- Or export it: `export MONGODB_URI="your-connection-string"`

**Error: Import errors**
- Make sure you're in the backend directory
- Activate your virtual environment
- Install dependencies: `pip install -r requirements.txt`

**Documents not being migrated**
- Check if documents already have `content_html` field
- Verify documents have non-empty `content` field
- Ensure documents are of type "file" (not "folder")

### After Migration

1. **Verify**: Check a few documents in the UI to ensure content displays correctly
2. **Monitor**: Watch for any issues with document loading/editing
3. **Cleanup** (Optional): After verifying, you can remove the old `content` field in a future migration

### Rollback

If you need to rollback:
- The old `content` field is preserved, so you can revert the frontend to use blocks
- Or manually clear `content_html` fields if needed


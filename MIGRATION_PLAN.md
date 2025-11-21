# TipTap Migration Plan

## Overview
Migrating from block-based Notion-like editor to TipTap WYSIWYG editor (Google Docs style).

## Current State
- **Frontend**: Block-based editor with `DocumentBlock[]` structure
- **Backend**: Stores `content: list[DocumentBlock]` in MongoDB
- **Block Types**: paragraph, heading1-3, bulleted-list, numbered-list, quote, code, image, file, table

## Target State
- **Frontend**: TipTap WYSIWYG editor with HTML content
- **Backend**: Store `content: str` (HTML) in MongoDB
- **Migration**: Convert existing `DocumentBlock[]` to HTML on-the-fly or via migration script

## Migration Strategy

### Phase 1: Frontend Implementation
1. ✅ Install TipTap packages
2. Create new TipTap-based DocumentEditor component
3. Create migration utility to convert DocumentBlock[] → HTML
4. Update EditorContent to use new editor
5. Keep old editor as fallback during transition

### Phase 2: Backend Support
1. Update DocumentItem model to support both formats:
   - `content_blocks: list[DocumentBlock] | None` (legacy)
   - `content_html: str | None` (new)
2. Update API to accept both formats
3. Auto-convert blocks → HTML on read if HTML is missing
4. Prefer HTML over blocks when both exist

### Phase 3: Data Migration
1. Create migration script to convert all existing documents
2. Run migration in batches
3. Verify converted documents
4. Remove legacy block support after migration complete

### Phase 4: Cleanup
1. Remove old DocumentEditor component
2. Remove DocumentBlock type (or keep for history)
3. Update types and schemas
4. Remove migration utilities

## Implementation Details

### TipTap Editor Features
- Basic formatting (bold, italic, underline, strikethrough)
- Headings (H1, H2, H3)
- Lists (bullet, numbered)
- Links
- Images
- Tables
- Code blocks
- Quotes

### Content Format
- **Storage**: HTML string
- **Display**: TipTap renders HTML directly
- **Read-only**: Use TipTap's read-only mode

### Migration Utility
Converts DocumentBlock[] to HTML:
- paragraph → `<p>content</p>`
- heading1 → `<h1>content</h1>`
- heading2 → `<h2>content</h2>`
- heading3 → `<h3>content</h3>`
- bulleted-list → `<ul><li>content</li></ul>`
- numbered-list → `<ol><li>content</li></ol>`
- quote → `<blockquote>content</blockquote>`
- code → `<pre><code>content</code></pre>`
- image → `<img src="url" alt="..." />`
- file → `<a href="url">fileName</a>`
- table → `<table>...</table>`

## Rollback Plan
- Keep old editor code until migration verified
- Backend supports both formats during transition
- Can revert to blocks if issues arise


# TipTap Migration Status

## ✅ Completed

### Frontend
1. ✅ Installed TipTap packages:
   - @tiptap/react
   - @tiptap/starter-kit
   - @tiptap/extension-link
   - @tiptap/extension-image
   - @tiptap/extension-table (and related table extensions)

2. ✅ Created TipTapEditor component (`fe/src/components/modules/DocumentEditor/TipTapEditor.tsx`)
   - Simple WYSIWYG editor like TipTap website
   - Supports: headings, lists, links, images, tables, code, quotes
   - Read-only mode support
   - Auto-save on content changes

3. ✅ Created migration utility (`fe/src/components/modules/DocumentEditor/_utils/migrateBlocksToHtml.ts`)
   - Converts DocumentBlock[] → HTML
   - Handles all block types (paragraph, headings, lists, code, quote, image, file, table)
   - Bidirectional conversion (HTML → Blocks) for backward compatibility

4. ✅ Updated frontend types
   - Added `contentHtml?: string | null` to DocumentItem interface

5. ✅ Created useTipTapEditor hook
   - Manages HTML content state
   - Handles save/autosave with HTML
   - Migration support (converts blocks to HTML if HTML missing)

6. ✅ Created EditorContentTipTap component
   - Uses TipTapEditor instead of old block-based editor
   - Maintains same UI (title, category, metadata)

7. ✅ Updated DocumentEditorPage
   - Now uses useTipTapEditor and EditorContentTipTap

8. ✅ Updated DocumentService
   - UpdateDocumentContentPayload now supports `content_html`

### Backend
1. ✅ Updated DocumentItem model
   - Added `content_html: str | None` field (alongside legacy `content`)

2. ✅ Updated DocumentUpdate schema
   - Added `content_html: str | None` field

3. ✅ Updated DocumentResponse schema
   - Added `content_html: str | None` field

4. ✅ Updated document service
   - `_serialize_document` includes content_html
   - `update_document` handles content_html updates

## 🔄 Migration Strategy

The system now supports **both formats simultaneously**:

1. **New documents**: Will use HTML format (content_html)
2. **Existing documents**: Still have blocks (content), will be converted on-the-fly when loaded
3. **Migration path**: 
   - When loading a document with blocks but no HTML, TipTapEditor converts blocks → HTML
   - When saving, HTML is stored in content_html
   - Old blocks remain for backward compatibility

## 📝 Next Steps

### Testing
1. Test creating a new document - should save as HTML
2. Test loading existing documents with blocks - should convert to HTML
3. Test editing existing documents - should update HTML
4. Test read-only mode
5. Test all formatting features (headings, lists, links, images, tables)

### Optional: Batch Migration Script
Create a script to convert all existing documents from blocks to HTML:
```python
# be/scripts/migrate_blocks_to_html.py
# Convert all documents.content → documents.content_html
```

### Optional: Cleanup (After Migration Verified)
1. Remove old DocumentEditor component
2. Remove DocumentBlock type (or keep for history)
3. Remove migration utilities
4. Remove content field from backend (keep only content_html)

## 🎯 Current State

- **Frontend**: Using TipTap editor ✅
- **Backend**: Supports both formats ✅
- **Migration**: On-the-fly conversion ✅
- **Backward Compatible**: Yes ✅

## ⚠️ Notes

- Old block-based editor code is still present (can be removed later)
- Documents can have both `content` (blocks) and `content_html` during transition
- TipTapEditor prefers HTML, falls back to converting blocks if HTML missing
- All new edits will save as HTML


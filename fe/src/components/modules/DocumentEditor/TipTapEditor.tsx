import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import TextAlign from '@tiptap/extension-text-align'
import type { Slice } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useCallback, useRef, useState, type ReactElement } from 'react'
import Swal from 'sweetalert2'

import { logger } from '@/lib/logger'
import { getFileUrl, uploadImage } from '@/lib/shared/services/UploadService'
import type { DocumentBlock } from '@/types/documents'

import { TipTapToolbar } from './_components/TipTapToolbar'
import { AUTOSAVE_DELAY } from './_constants'
import { migrateBlocksToHtml } from './_utils/migrateBlocksToHtml'

interface TipTapEditorProps {
  initialBlocks?: DocumentBlock[]
  initialHtml?: string
  onSave?: (html: string) => void
  readOnly?: boolean
  className?: string
  showToolbar?: boolean
  onEditorReady?: (editor: Editor | null) => void
}

/**
 * TipTap-based WYSIWYG editor component.
 * Simple editor similar to TipTap website demo.
 */
export function TipTapEditor({
  initialBlocks,
  initialHtml,
  onSave,
  readOnly = false,
  className = '',
  showToolbar = true,
  onEditorReady,
}: TipTapEditorProps): ReactElement {
  // Debounce timer ref
  const debounceTimerRef = useRef<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Convert blocks to HTML if provided (for migration)
  const getInitialContent = useCallback((): string => {
    // Prefer HTML if available
    if (initialHtml && initialHtml.trim() !== '' && initialHtml !== '<p></p>') {
      return initialHtml
    }
    // Fallback to converting blocks if HTML is missing (migration path)
    if (initialBlocks && initialBlocks.length > 0) {
      return migrateBlocksToHtml(initialBlocks)
    }
    return '<p></p>'
  }, [initialBlocks, initialHtml])

  // Handle file drop in editor
  const handleEditorDrop = useCallback(
    (view: EditorView, event: DragEvent, _slice: Slice, moved: boolean): boolean => {
      if (readOnly || moved) {
        return false
      }

      const files = event.dataTransfer?.files
      if (!files || files.length === 0) {
        return false
      }

      // Filter for image files only
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
      if (imageFiles.length === 0) {
        return false
      }

      event.preventDefault()

      // Get the position where the drop occurred
      const coordinates = view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
      })

      if (!coordinates) {
        return false
      }

            // Upload and insert each image asynchronously
            for (const file of imageFiles) {
              void (async (): Promise<void> => {
          try {
            setIsDragging(true)
            const uploadResult = await uploadImage(file)
            const imageUrl = getFileUrl(uploadResult.url)

            // Insert image at the drop position
            const { tr } = view.state
            const imageNode = view.state.schema.nodes.image.create({
              src: imageUrl,
            })
            tr.insert(coordinates.pos, imageNode)
            view.dispatch(tr)
          } catch (error) {
            logger.error('Failed to upload dropped image:', error)
            void Swal.fire({
              toast: true,
              icon: 'error',
              title: 'Failed to upload image. Please try again.',
              position: 'top-end',
              showConfirmButton: false,
              timer: 4000,
            })
          } finally {
            setIsDragging(false)
          }
        })()
      }

      return true
    },
    [readOnly],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable some features we might not need
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-gray-300',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: getInitialContent(),
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[1248px] px-4 py-2 ${isDragging ? 'bg-blue-50' : ''}`,
        'data-placeholder': 'Write here',
      },
      handleDrop: handleEditorDrop,
      handlePaste: (view: EditorView, event: ClipboardEvent, _slice: Slice): boolean => {
        // Handle paste for images
        if (readOnly) {
          return false
        }

        const items = event.clipboardData?.items
        if (!items) {
          return false
        }

        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) {
              void (async (): Promise<void> => {
                try {
                  const uploadResult = await uploadImage(file)
                  const imageUrl = getFileUrl(uploadResult.url)
                  const { tr } = view.state
                  const imageNode = view.state.schema.nodes.image.create({
                    src: imageUrl,
                  })
                  tr.replaceSelectionWith(imageNode)
                  view.dispatch(tr)
                } catch (error) {
                  logger.error('Failed to upload pasted image:', error)
                  void Swal.fire({
                    toast: true,
                    icon: 'error',
                    title: 'Failed to upload image. Please try again.',
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 4000,
                  })
                }
              })().catch((error) => {
                logger.error('Error in paste handler:', error)
              })
            }
            return true
          }
        }

        return false
      },
    },
    onUpdate: ({ editor }) => {
      if (onSave && !readOnly) {
        // Clear existing timer
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current)
        }

        // Set new debounced save
        debounceTimerRef.current = window.setTimeout(() => {
          const html = editor.getHTML()
          onSave(html)
          debounceTimerRef.current = null
        }, AUTOSAVE_DELAY)
      }
    },
  })

  // Notify parent when editor is ready (wait for view to be available)
  useEffect((): (() => void) | void => {
    if (editor && onEditorReady && editor.view) {
      // Use a small delay to ensure the view is fully initialized
      const timeoutId = setTimeout(() => {
        if (editor && !editor.isDestroyed && editor.view) {
          onEditorReady(editor)
        }
      }, 0)
      return (): void => {
        clearTimeout(timeoutId)
      }
    }
  }, [editor, onEditorReady])

  // Update content when initialBlocks or initialHtml changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const newContent = getInitialContent()
      const currentContent = editor.getHTML()
      
      // Only update if content actually changed
      if (newContent !== currentContent) {
        editor.commands.setContent(newContent, { emitUpdate: false })
      }
    }
  }, [editor, getInitialContent])

  // Cleanup on unmount
  useEffect((): (() => void) => {
    return (): void => {
      // Clear debounce timer
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      // Destroy editor
      if (editor && !editor.isDestroyed) {
        editor.destroy()
      }
    }
  }, [editor])

  if (!editor) {
    return (
      <div className={`min-h-[200px] border-2 border-gray-300 p-4 ${className}`}>
        <p className="text-gray-500">Loading editor...</p>
      </div>
    )
  }

  return (
    <div
      className={`tiptap-editor-wrapper border-2 border-gray-300 overflow-hidden bg-white ${className} ${isDragging ? 'border-blue-400 bg-blue-50' : ''}`}
      onDragOver={(e) => {
        if (!readOnly && e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setIsDragging(true)
        }
      }}
      onDragLeave={(e) => {
        // Only set dragging to false if we're leaving the wrapper entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false)
        }
      }}
      onDrop={() => {
        setIsDragging(false)
        // Let TipTap handle the drop if it's within the editor content
        // The handleEditorDrop will process it
      }}
    >
      {!readOnly && showToolbar && <TipTapToolbar editor={editor} />}
      <EditorContent editor={editor} />
      <style>{`
        .tiptap-editor-wrapper .ProseMirror {
          outline: none;
          background-color: white;
        }
        .tiptap-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor-wrapper .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 0.67em;
          margin-bottom: 0.67em;
        }
        .tiptap-editor-wrapper .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.83em;
          margin-bottom: 0.83em;
        }
        .tiptap-editor-wrapper .ProseMirror h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 1em;
        }
        .tiptap-editor-wrapper .ProseMirror ul,
        .tiptap-editor-wrapper .ProseMirror ol {
          padding-left: 1.5em;
          margin: 1em 0;
        }
        .tiptap-editor-wrapper .ProseMirror ul {
          list-style-type: disc;
        }
        .tiptap-editor-wrapper .ProseMirror ol {
          list-style-type: decimal;
        }
        .tiptap-editor-wrapper .ProseMirror blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          color: #6b7280;
        }
        .tiptap-editor-wrapper .ProseMirror pre {
          background: #f3f4f6;
          border-radius: 0.375rem;
          padding: 1em;
          margin: 1em 0;
          overflow-x: auto;
        }
        .tiptap-editor-wrapper .ProseMirror code {
          background: #f3f4f6;
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-family: 'Courier New', monospace;
        }
        .tiptap-editor-wrapper .ProseMirror pre code {
          background: transparent;
          padding: 0;
        }
        .tiptap-editor-wrapper .ProseMirror img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
        }
        .tiptap-editor-wrapper .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
        }
        .tiptap-editor-wrapper .ProseMirror table {
          border-collapse: collapse;
          margin: 1em 0;
          width: 100%;
        }
        .tiptap-editor-wrapper .ProseMirror table td,
        .tiptap-editor-wrapper .ProseMirror table th {
          border: 1px solid #d1d5db;
          padding: 0.5em;
          min-width: 100px;
        }
        .tiptap-editor-wrapper .ProseMirror table th {
          background-color: #f9fafb;
          font-weight: bold;
        }
        .tiptap-editor-wrapper .ProseMirror [style*="text-align: left"] {
          text-align: left;
        }
        .tiptap-editor-wrapper .ProseMirror [style*="text-align: center"] {
          text-align: center;
        }
        .tiptap-editor-wrapper .ProseMirror [style*="text-align: right"] {
          text-align: right;
        }
        .tiptap-editor-wrapper .ProseMirror [style*="text-align: justify"] {
          text-align: justify;
        }
      `}</style>
    </div>
  )
}


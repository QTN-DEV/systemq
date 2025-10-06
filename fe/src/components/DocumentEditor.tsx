// src/components/DocumentEditor.tsx
import {
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Plus,
  GripVertical,
  X,
  Image,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from 'lucide-react'
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  type ReactElement,
} from 'react'

import { logger } from '@/lib/logger'
import { uploadImage, uploadFile, getFileUrl } from '../services/UploadService'

export interface DocumentBlock {
  id: string
  type:
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulleted-list'
  | 'numbered-list'
  | 'quote'
  | 'code'
  | 'image'
  | 'file'
  content: string
  alignment?: 'left' | 'center' | 'right'
  url?: string
  fileName?: string
  fileSize?: string
}

interface DocumentEditorProps {
  initialBlocks?: DocumentBlock[]
  onSave?: (blocks: DocumentBlock[]) => void
  readOnly?: boolean
  title?: string
  onTitleChange?: (title: string) => void
}

/** Global CSS for contentEditable placeholder */
const PlaceholderStyles = () => (
  <style>{`
  .ce-editable[contenteditable="true"]:empty:before {
    content: attr(data-placeholder);
    color: #9ca3af; /* tailwind gray-400 */
    pointer-events: none;
    opacity: 0.9;
  }
`}</style>
)

/** Type Menu (supports drop-down / drop-up via `placement`) */
const TypeMenu = ({
  blockId,
  onChangeBlockType,
  placement = 'bottom',
}: {
  blockId: string
  onChangeBlockType: (blockId: string, newType: DocumentBlock['type']) => void
  placement?: 'bottom' | 'top'
}): ReactElement => (
  <div
    className={`absolute z-10 ${placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
      } bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[220px]`}
  >
    <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
      Basic blocks
    </div>

    {[
      { type: 'paragraph' as const, icon: Type, label: 'Text' },
      { type: 'heading1' as const, icon: Heading1, label: 'Heading 1' },
      { type: 'heading2' as const, icon: Heading2, label: 'Heading 2' },
      { type: 'heading3' as const, icon: Heading3, label: 'Heading 3' },
      { type: 'bulleted-list' as const, icon: List, label: 'Bulleted list' },
      { type: 'numbered-list' as const, icon: ListOrdered, label: 'Numbered list' },
      { type: 'quote' as const, icon: Quote, label: 'Quote' },
      { type: 'code' as const, icon: Code, label: 'Code' },
      { type: 'image' as const, icon: Image, label: 'Image' },
      { type: 'file' as const, icon: FileText, label: 'File' },
    ].map(({ type, icon: Icon, label }) => (
      <button
        key={type}
        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
        onClick={() => onChangeBlockType(blockId, type)}
      >
        <Icon className="w-5 h-5 text-gray-400" />
        <div className="text-sm font-medium text-gray-900">{label}</div>
      </button>
    ))}
  </div>
)

function DocumentEditor({
  initialBlocks = [],
  onSave,
  readOnly = false,
}: DocumentEditorProps): ReactElement {
  const [blocks, setBlocks] = useState<DocumentBlock[]>(
    initialBlocks.length > 0
      ? initialBlocks
      : [{ id: '1', type: 'paragraph', content: '', alignment: 'left' }],
  )
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [showTypeMenu, setShowTypeMenu] = useState<string | null>(null)
  const [showGripMenu, setShowGripMenu] = useState<string | null>(null)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [uploadingBlocks, setUploadingBlocks] = useState<Set<string>>(new Set())
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)

  // Refs
  const blockRefs = useRef<{ [key: string]: HTMLElement | null }>({})
  const prevContentRef = useRef<{ [key: string]: string }>({})
  const savedSelectionRef = useRef<{
    blockId: string
    start: number
    end: number
    backward: boolean
  } | null>(null)
  const isSelectingRef = useRef(false)

  // Menu refs + placement
  const gripMenuRef = useRef<HTMLDivElement | null>(null)
  const typeMenuRef = useRef<HTMLDivElement | null>(null)
  const [gripMenuPlacement, setGripMenuPlacement] = useState<'bottom' | 'top'>('bottom')
  const [typeMenuPlacement, setTypeMenuPlacement] = useState<'bottom' | 'top'>('bottom')

  // Floating text formatting toolbar
  const [showTextToolbar, setShowTextToolbar] = useState(false)
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [toolbarBlockId, setToolbarBlockId] = useState<string | null>(null)
  const [formatState, setFormatState] = useState<{ bold: boolean; italic: boolean; underline: boolean }>({
    bold: false,
    italic: false,
    underline: false,
  })

  /** ---------- Selection helpers (caret preservation) ---------- */
  const getSelectionOffsets = (
    element: HTMLElement,
  ): { start: number; end: number; backward: boolean } | null => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const range = sel.getRangeAt(0)
    if (!element.contains(range.commonAncestorContainer)) return null

    const preRangeStart = range.cloneRange()
    preRangeStart.selectNodeContents(element)
    preRangeStart.setEnd(range.startContainer, range.startOffset)
    const start = preRangeStart.toString().length

    const preRangeEnd = range.cloneRange()
    preRangeEnd.selectNodeContents(element)
    preRangeEnd.setEnd(range.endContainer, range.endOffset)
    const end = preRangeEnd.toString().length

    let backward = false
    try {
      if (sel.anchorNode && sel.focusNode) {
        if (sel.anchorNode === sel.focusNode) {
          backward = sel.anchorOffset > sel.focusOffset
        } else {
          const pos = sel.anchorNode.compareDocumentPosition(sel.focusNode)
          backward = Boolean(pos & Node.DOCUMENT_POSITION_PRECEDING)
        }
      }
    } catch { }
    return { start, end, backward }
  }

  const setSelectionOffsets = (
    element: HTMLElement,
    start: number,
    end: number,
    backward = false,
  ): void => {
    let charIndex = 0
    let startNode: Text | null = null
    let startOffsetInNode = 0
    let endNode: Text | null = null
    let endOffsetInNode = 0

    const stack: Node[] = [element]
    let node: Node | undefined
    while ((node = stack.pop())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node as Text
        const nextChar = charIndex + text.length
        if (!startNode && start >= charIndex && start <= nextChar) {
          startNode = text
          startOffsetInNode = Math.max(0, Math.min(text.length, start - charIndex))
        }
        if (!endNode && end >= charIndex && end <= nextChar) {
          endNode = text
          endOffsetInNode = Math.max(0, Math.min(text.length, end - charIndex))
        }
        charIndex = nextChar
        if (startNode && endNode) break
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const children = (node as Element).childNodes
        for (let i = children.length - 1; i >= 0; i--) stack.push(children[i])
      }
    }

    const sel = window.getSelection()
    if (!sel) return
    sel.removeAllRanges()
    try {
      if (sel.setBaseAndExtent && startNode && endNode) {
        if (backward) sel.setBaseAndExtent(endNode, endOffsetInNode, startNode, startOffsetInNode)
        else sel.setBaseAndExtent(startNode, startOffsetInNode, endNode, endOffsetInNode)
        return
      }
    } catch { }

    const range = document.createRange()
    if (startNode) range.setStart(startNode, startOffsetInNode)
    else range.setStart(element, 0)
    if (endNode) range.setEnd(endNode, endOffsetInNode)
    else range.setEnd(element, element.childNodes.length)
    sel.addRange(range)
  }

  const saveSelectionForBlock = (blockId: string): void => {
    const host = blockRefs.current[blockId]
    if (!host) return
    const sel = window.getSelection()
    if (!sel) return
    if (!sel.isCollapsed) return
    const offsets = getSelectionOffsets(host)
    if (offsets && offsets.start === offsets.end) {
      savedSelectionRef.current = { blockId, ...offsets }
    }
  }

  /** ---------- Autosave ---------- */
  useEffect((): (() => void) | void => {
    if (onSave) {
      const tid = setTimeout(() => onSave(blocks), 1000)
      return () => clearTimeout(tid)
    }
  }, [blocks, onSave])

  /** ---------- Outside click + Esc (no overlay; page still scrolls) ---------- */
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent): void => {
      const t = e.target as Node
      if (showGripMenu && !gripMenuRef.current?.contains(t)) setShowGripMenu(null)
      if (showTypeMenu && !typeMenuRef.current?.contains(t)) setShowTypeMenu(null)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setShowGripMenu(null)
        setShowTypeMenu(null)
      }
    }
    window.addEventListener('mousedown', onDocMouseDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDocMouseDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [showGripMenu, showTypeMenu])

  /** ---------- Auto-flip menus when near viewport edge ---------- */
  useEffect(() => {
    if (!showGripMenu) return
    requestAnimationFrame(() => {
      const el = gripMenuRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const needsFlip = rect.bottom > window.innerHeight && rect.top > 0
      setGripMenuPlacement(needsFlip ? 'top' : 'bottom')
    })
  }, [showGripMenu])

  useEffect(() => {
    if (!showTypeMenu) return
    requestAnimationFrame(() => {
      const el = typeMenuRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const needsFlip = rect.bottom > window.innerHeight && rect.top > 0
      setTypeMenuPlacement(needsFlip ? 'top' : 'bottom')
    })
  }, [showTypeMenu])

  /** ---------- Keep caret on re-render ---------- */
  useLayoutEffect(() => {
    if (!savedSelectionRef.current) return
    const { blockId, start, end, backward } = savedSelectionRef.current
    if (start !== end) return
    const el = blockRefs.current[blockId]
    if (!el) return
    const sel = window.getSelection()
    if (!sel) return
    if (sel.rangeCount > 0) {
      const r = sel.getRangeAt(0)
      if (!sel.isCollapsed && el.contains(r.commonAncestorContainer)) return
    }
    try {
      if (document.activeElement !== el) el.focus()
      setSelectionOffsets(el, start, end, backward)
    } catch { }
  }, [blocks])

  /** ---------- Selection end guard ---------- */
  useEffect(() => {
    const handleUp = (): void => {
      isSelectingRef.current = false
    }
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mouseup', handleUp)
    }
  }, [])

  /** ---------- Upload ---------- */
  const uploadFileToServer = async (
    file: File,
    blockType: 'image' | 'file',
  ): Promise<{ url: string; fileName: string; fileSize: string }> => {
    try {
      const uploadResponse =
        blockType === 'image' ? await uploadImage(file) : await uploadFile(file)

      return {
        url: getFileUrl(uploadResponse.url),
        fileName: uploadResponse.fileName,
        fileSize: uploadResponse.fileSize,
      }
    } catch (error) {
      logger.error('Upload failed:', error)
      throw new Error(`Failed to upload ${blockType}`)
    }
  }

  /** ---------- Blocks ops ---------- */
  const addBlock = (afterId: string, type: DocumentBlock['type'] = 'paragraph'): void => {
    const newBlock: DocumentBlock = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      content: '',
      alignment: 'left',
    }

    const afterIndex = blocks.findIndex((block) => block.id === afterId)
    const newBlocks = [
      ...blocks.slice(0, afterIndex + 1),
      newBlock,
      ...blocks.slice(afterIndex + 1),
    ]

    setBlocks(newBlocks)
    setActiveBlockId(newBlock.id)

    setTimeout(() => {
      const element = blockRefs.current[newBlock.id]
      if (element) element.focus()
    }, 0)
  }

  const updateBlock = (id: string, updates: Partial<DocumentBlock>): void => {
    const el = blockRefs.current[id] || null
    const isContentUpdate = Object.prototype.hasOwnProperty.call(updates, 'content')
    if (isContentUpdate && el && document.activeElement === el && (el as HTMLElement).isContentEditable) {
      const offsets = getSelectionOffsets(el as HTMLElement)
      if (offsets) savedSelectionRef.current = { blockId: id, ...offsets }
    }
    setBlocks(blocks.map((block) => (block.id === id ? { ...block, ...updates } : block)))
  }

  const deleteBlock = (id: string): void => {
    if (blocks.length === 1) return
    const blockIndex = blocks.findIndex((block) => block.id === id)
    const newBlocks = blocks.filter((block) => block.id !== id)
    setBlocks(newBlocks)

    const focusIndex = blockIndex > 0 ? blockIndex - 1 : 0
    if (newBlocks[focusIndex]) {
      setActiveBlockId(newBlocks[focusIndex].id)
      setTimeout(() => {
        const element = blockRefs.current[newBlocks[focusIndex].id]
        if (element) element.focus()
      }, 0)
    }
  }

  const moveBlock = (fromId: string, toId: string): void => {
    const fromIndex = blocks.findIndex((block) => block.id === fromId)
    const toIndex = blocks.findIndex((block) => block.id === toId)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return

    const newBlocks = [...blocks]
    const [movedBlock] = newBlocks.splice(fromIndex, 1)
    newBlocks.splice(toIndex, 0, movedBlock)
    setBlocks(newBlocks)
  }

  /** ---------- DnD ---------- */
  const handleDragStart = (e: React.DragEvent, blockId: string): void => {
    setDraggedBlockId(blockId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', blockId)
  }

  const handleDragOver = (e: React.DragEvent, blockId: string): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedBlockId !== blockId) setDragOverBlockId(blockId)
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const { clientX: x, clientY: y } = e
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverBlockId(null)
    }
  }

  const handleDrop = (e: React.DragEvent, blockId: string): void => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId && draggedId !== blockId) moveBlock(draggedId, blockId)
    setDraggedBlockId(null)
    setDragOverBlockId(null)
  }

  const handleDragEnd = (): void => {
    setDraggedBlockId(null)
    setDragOverBlockId(null)
  }

  /** ---------- Upload handlers ---------- */
  const handleFileUpload = async (blockId: string, file: File): Promise<void> => {
    if (readOnly) return
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return
    const blockType: 'image' | 'file' = block.type === 'image' ? 'image' : 'file'
    setUploadingBlocks((prev) => new Set(prev).add(blockId))
    try {
      const uploadResult = await uploadFileToServer(file, blockType)
      updateBlock(blockId, {
        url: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        content: blockType === 'file' ? uploadResult.fileName : file.name,
      })
    } catch (error) {
      logger.error('Upload failed:', error)
    } finally {
      setUploadingBlocks((prev) => {
        const next = new Set(prev)
        next.delete(blockId)
        return next
      })
    }
  }

  /** ---------- Keyboard ---------- */
  const handleKeyDown = (e: React.KeyboardEvent, blockId: string): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addBlock(blockId)
    } else if (e.key === 'Backspace') {
      const block = blocks.find((b) => b.id === blockId)
      if (block && block.content === '' && blocks.length > 1) {
        e.preventDefault()
        deleteBlock(blockId)
      }
    } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      const block = blocks.find((b) => b.id === blockId)
      if (block && block.content === '') {
        e.preventDefault()
        setShowTypeMenu(blockId)
      }
    }
  }

  /** ---------- UI helpers ---------- */
  const getBlockPlaceholder = (type: DocumentBlock['type']): string => {
    switch (type) {
      case 'heading1':
        return 'Heading 1'
      case 'heading2':
        return 'Heading 2'
      case 'heading3':
        return 'Heading 3'
      case 'bulleted-list':
        return 'Bulleted list'
      case 'numbered-list':
        return 'Numbered list'
      case 'quote':
        return 'Quote'
      case 'code':
        return 'Code block'
      case 'image':
        return 'Enter image URL or upload an image'
      case 'file':
        return 'Enter file name or upload a file'
      default:
        return "Type '/' for commands"
    }
  }

  /** ---------- Render a block ---------- */
  const getBlockElement = (block: DocumentBlock): ReactElement => {
    switch (block.type) {
      case 'heading1':
      case 'heading2':
      case 'heading3':
      case 'quote': {
        const typeClass =
          block.type === 'heading1'
            ? 'text-3xl font-bold'
            : block.type === 'heading2'
              ? 'text-2xl font-semibold'
              : block.type === 'heading3'
                ? 'text-xl font-medium'
                : 'border-l-4 border-gray-300 pl-4 italic bg-gray-50'

        return (
          <div
            ref={(el): void => {
              blockRefs.current[block.id] = el
              if (!el) return
              if (document.activeElement !== el) {
                const next = block.content || ''
                if (prevContentRef.current[block.id] !== next) {
                  el.innerHTML = next
                  prevContentRef.current[block.id] = next
                }
              }
            }}
            className={`ce-editable w-full bg-transparent outline-none overflow-hidden min-h-[1.5em] text-left text-gray-900 focus:outline-none ${typeClass}`}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-placeholder={getBlockPlaceholder(block.type)}
            onFocus={(): void => {
              setActiveBlockId(block.id)
              saveSelectionForBlock(block.id)
            }}
            onMouseDown={(): void => {
              setActiveBlockId(block.id)
              isSelectingRef.current = true
            }}
            onKeyUp={() => saveSelectionForBlock(block.id)}
            onClick={() => saveSelectionForBlock(block.id)}
            // 🔧 Always forward keydown to handler (so '/' works). Still prevent default Enter behavior.
            onKeyDown={(e): void => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
              }
              handleKeyDown(e as unknown as React.KeyboardEvent, block.id)
            }}
            onInput={(e): void => {
              const html = (e.currentTarget as HTMLDivElement).innerHTML
              prevContentRef.current[block.id] = html
              updateBlock(block.id, { content: html })
            }}
            onMouseUp={(): void => {
              if (readOnly) return
              saveSelectionForBlock(block.id)
              isSelectingRef.current = false
              const sel = window.getSelection()
              if (!sel || sel.isCollapsed) {
                setShowTextToolbar(false)
                setToolbarBlockId(null)
                return
              }
              const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null
              if (!range) return
              const container = blockRefs.current[block.id]
              if (!container || !container.contains(range.commonAncestorContainer)) {
                setShowTextToolbar(false)
                setToolbarBlockId(null)
                return
              }
              let rect = range.getBoundingClientRect()
              if ((!rect || (rect.width === 0 && rect.height === 0)) && typeof range.getClientRects === 'function') {
                const rects = range.getClientRects()
                if (rects && rects.length > 0) rect = rects[0]
              }
              const x = rect.left + rect.width / 2
              const y = rect.top - 8
              setToolbarPos({ x, y })
              setToolbarBlockId(block.id)
              setShowTextToolbar(true)
              try {
                setFormatState({
                  bold: document.queryCommandState('bold'),
                  italic: document.queryCommandState('italic'),
                  underline: document.queryCommandState('underline'),
                })
              } catch { }
            }}
          />
        )
      }

      case 'code':
        return (
          <textarea
            className="w-full font-mono text-sm bg-gray-100 p-3 rounded outline-none"
            rows={1}
            placeholder={getBlockPlaceholder(block.type)}
            value={block.content}
            disabled={readOnly}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, block.id)}
            onInput={(e): void => {
              const target = e.currentTarget
              target.style.height = 'auto'
              target.style.height = `${target.scrollHeight}px`
            }}
          />
        )

      case 'bulleted-list':
      case 'numbered-list': {
        const isNumbered = block.type === 'numbered-list'
        const listIndex = isNumbered
          ? blocks.filter(
            (b, i) =>
              i <= blocks.findIndex((b) => b.id === block.id) &&
              b.type === 'numbered-list',
          ).length
          : null

        return (
          <div className="flex items-start space-x-2">
            <span className="text-gray-500 select-none">
              {isNumbered ? `${listIndex}.` : '•'}
            </span>
            <div
              ref={(el): void => {
                blockRefs.current[block.id] = el
                if (!el) return
                if (document.activeElement !== el) {
                  const next = block.content || ''
                  if (prevContentRef.current[block.id] !== next) {
                    el.innerHTML = next
                    prevContentRef.current[block.id] = next
                  }
                }
              }}
              className="ce-editable flex-1 w-full bg-transparent outline-none overflow-hidden min-h-[1.5em] text-left text-gray-900 focus:outline-none"
              contentEditable={!readOnly}
              suppressContentEditableWarning
              data-placeholder={getBlockPlaceholder(block.type)}
              onFocus={(): void => {
                setActiveBlockId(block.id)
                saveSelectionForBlock(block.id)
              }}
              onMouseDown={() => {
                setActiveBlockId(block.id)
                isSelectingRef.current = true
              }}
              onKeyUp={() => saveSelectionForBlock(block.id)}
              onClick={() => saveSelectionForBlock(block.id)}
              // 🔧 Always forward keydown to handler (so '/' works). Still prevent default Enter behavior.
              onKeyDown={(e): void => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                }
                handleKeyDown(e as unknown as React.KeyboardEvent, block.id)
              }}
              onInput={(e): void => {
                const html = (e.currentTarget as HTMLDivElement).innerHTML
                prevContentRef.current[block.id] = html
                updateBlock(block.id, { content: html })
              }}
              onMouseUp={(): void => {
                if (readOnly) return
                saveSelectionForBlock(block.id)
                isSelectingRef.current = false
                const sel = window.getSelection()
                if (!sel || sel.isCollapsed) {
                  setShowTextToolbar(false)
                  setToolbarBlockId(null)
                  return
                }
                const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null
                if (!range) return
                const container = blockRefs.current[block.id]
                if (!container || !container.contains(range.commonAncestorContainer)) {
                  setShowTextToolbar(false)
                  setToolbarBlockId(null)
                  return
                }
                let rect = range.getBoundingClientRect()
                if ((!rect || (rect.width === 0 && rect.height === 0)) && typeof range.getClientRects === 'function') {
                  const rects = range.getClientRects()
                  if (rects && rects.length > 0) rect = rects[0]
                }
                const x = rect.left + rect.width / 2
                const y = rect.top - 8
                setToolbarPos({ x, y })
                setToolbarBlockId(block.id)
                setShowTextToolbar(true)
                try {
                  setFormatState({
                    bold: document.queryCommandState('bold'),
                    italic: document.queryCommandState('italic'),
                    underline: document.queryCommandState('underline'),
                  })
                } catch { }
              }}
            />
          </div>
        )
      }

      case 'image': {
        const isUploading = uploadingBlocks.has(block.id)
        const hasImage = block.url && !isUploading

        if (hasImage) {
          const imageAlignment = block.alignment ?? 'center'
          const alignmentClasses = {
            left: 'justify-start',
            center: 'justify-center',
            right: 'justify-end',
          } as const

          return (
            <div className={`flex w-full ${alignmentClasses[imageAlignment]}`}>
              <div
                className="relative group"
                onMouseEnter={() => !readOnly && setHoveredImageId(block.id)}
                onMouseLeave={() => setHoveredImageId(null)}
              >
                <img
                  src={block.url}
                  alt={block.content || 'Uploaded image'}
                  className="max-w-full h-auto rounded-lg shadow-sm"
                  style={{ maxHeight: '500px' }}
                />

                {hoveredImageId === block.id && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 -translate-y-2 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <button
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${imageAlignment === 'left' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                        }`}
                      onClick={() => updateBlock(block.id, { alignment: 'left' })}
                      title="Align left"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${imageAlignment === 'center' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                        }`}
                      onClick={() => updateBlock(block.id, { alignment: 'center' })}
                      title="Align center"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${imageAlignment === 'right' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                        }`}
                      onClick={() => updateBlock(block.id, { alignment: 'right' })}
                      title="Align right"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        }

        return (
          <div className="space-y-3">
            {isUploading ? (
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Uploading image...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer bg-gray-50">
                  <label className="cursor-pointer text-center">
                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">Click to upload an image</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleFileUpload(block.id, file)
                      }}
                      disabled={readOnly}
                    />
                  </label>
                </div>
                <div className="text-center text-sm text-gray-500">or</div>
                <input
                  type="url"
                  placeholder="Paste image URL"
                  className="w-full text-sm border border-gray-200 rounded px-3 py-2 text-center outline-none"
                  value={block.url ?? ''}
                  onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                  disabled={readOnly}
                />
              </div>
            )}
          </div>
        )
      }

      case 'file': {
        const isUploading = uploadingBlocks.has(block.id)
        const hasFile = block.url && block.fileName && !isUploading

        if (hasFile) {
          return (
            <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <FileText className="w-10 h-10 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{block.fileName}</h4>
                  <p className="text-xs text-gray-500 mt-1">{block.fileSize}</p>
                </div>
                <div className="flex-shrink-0">
                  <a
                    href={block.url}
                    download={block.fileName}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          )
        }

        return (
          <div className="space-y-3">
            {isUploading ? (
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Uploading file...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer bg-gray-50">
                  <label className="cursor-pointer text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">Click to upload a file</p>
                    <p className="text-xs text-gray-500 mt-1">Any file type up to 50MB</p>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleFileUpload(block.id, file)
                      }}
                      disabled={readOnly}
                    />
                  </label>
                </div>
                <div className="text-center text-sm text-gray-500">or</div>
                <div className="space-y-2">
                  <input
                    placeholder="File name"
                    className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none"
                    value={block.fileName ?? block.content}
                    onChange={(e) =>
                      updateBlock(block.id, {
                        fileName: e.target.value,
                        content: e.target.value,
                      })
                    }
                    disabled={readOnly}
                  />
                  <input
                    type="url"
                    placeholder="Paste file URL"
                    className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none"
                    value={block.url ?? ''}
                    onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
              </div>
            )}
          </div>
        )
      }

      default:
        // paragraph (contentEditable) — uses data-placeholder instead of invalid placeholder prop
        return (
          <div
            ref={(el): void => {
              blockRefs.current[block.id] = el
              if (!el) return
              if (document.activeElement !== el) {
                const next = block.content || ''
                if (prevContentRef.current[block.id] !== next) {
                  el.innerHTML = next
                  prevContentRef.current[block.id] = next
                }
              }
            }}
            className="ce-editable w-full bg-transparent outline-none overflow-hidden min-h-[1.5em] text-left text-gray-900 focus:outline-none"
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-placeholder={getBlockPlaceholder(block.type)}
            onFocus={(): void => {
              setActiveBlockId(block.id)
              saveSelectionForBlock(block.id)
            }}
            onMouseDown={() => {
              setActiveBlockId(block.id)
              isSelectingRef.current = true
            }}
            onKeyUp={() => saveSelectionForBlock(block.id)}
            onClick={() => saveSelectionForBlock(block.id)}
            // 🔧 Always forward keydown to handler (so '/' works). Still prevent default Enter behavior.
            onKeyDown={(e): void => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
              }
              handleKeyDown(e as unknown as React.KeyboardEvent, block.id)
            }}
            onInput={(e): void => {
              const html = (e.currentTarget as HTMLDivElement).innerHTML
              prevContentRef.current[block.id] = html
              updateBlock(block.id, { content: html })
            }}
            onMouseUp={(): void => {
              if (readOnly) return
              saveSelectionForBlock(block.id)
              isSelectingRef.current = false
              const sel = window.getSelection()
              if (!sel || sel.isCollapsed) {
                setShowTextToolbar(false)
                setToolbarBlockId(null)
                return
              }
              const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null
              if (!range) return
              const container = blockRefs.current[block.id]
              if (!container || !container.contains(range.commonAncestorContainer)) {
                setShowTextToolbar(false)
                setToolbarBlockId(null)
                return
              }
              let rect = range.getBoundingClientRect()
              if ((!rect || (rect.width === 0 && rect.height === 0)) && typeof range.getClientRects === 'function') {
                const rects = range.getClientRects()
                if (rects && rects.length > 0) rect = rects[0]
              }
              const x = rect.left + rect.width / 2
              const y = rect.top - 8
              setToolbarPos({ x, y })
              setToolbarBlockId(block.id)
              setShowTextToolbar(true)
              try {
                setFormatState({
                  bold: document.queryCommandState('bold'),
                  italic: document.queryCommandState('italic'),
                  underline: document.queryCommandState('underline'),
                })
              } catch { }
            }}
          />
        )
    }
  }

  return (
    <div className="w-full">
      <PlaceholderStyles />

      {/* Blocks */}
      <div className="space-y-2">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`group relative transition-all duration-200 ${dragOverBlockId === block.id ? 'border-t-2 border-blue-400' : ''
              } ${draggedBlockId === block.id ? 'opacity-50' : ''}`}
            onMouseEnter={() => !readOnly && setActiveBlockId(block.id)}
            onDragOver={(e) => handleDragOver(e, block.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, block.id)}
          >
            {/* Block controls */}
            {!readOnly && activeBlockId === block.id && (
              <div className="absolute -left-14 top-0 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded mb-0.5"
                  onClick={() => addBlock(block.id)}
                  title="Add block"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <div className="relative">
                  <button
                    draggable
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setShowGripMenu(showGripMenu === block.id ? null : block.id)
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      setShowGripMenu(showGripMenu === block.id ? null : block.id)
                    }}
                    title="Drag to reorder, click/right-click to change type"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>

                  {/* Grip Menu (no overlay; page can scroll) */}
                  {showGripMenu === block.id && (
                    <div
                      ref={gripMenuRef}
                      className={`absolute left-0 ${gripMenuPlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                        } bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[220px] z-10`}
                    >
                      <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Change to
                      </div>
                      {[
                        { type: 'paragraph' as const, icon: Type, label: 'Text' },
                        { type: 'heading1' as const, icon: Heading1, label: 'Heading 1' },
                        { type: 'heading2' as const, icon: Heading2, label: 'Heading 2' },
                        { type: 'heading3' as const, icon: Heading3, label: 'Heading 3' },
                        { type: 'bulleted-list' as const, icon: List, label: 'Bulleted list' },
                        { type: 'numbered-list' as const, icon: ListOrdered, label: 'Numbered list' },
                        { type: 'quote' as const, icon: Quote, label: 'Quote' },
                        { type: 'code' as const, icon: Code, label: 'Code' },
                        { type: 'image' as const, icon: Image, label: 'Image' },
                        { type: 'file' as const, icon: FileText, label: 'File' },
                      ].map(({ type, icon: Icon, label }) => (
                        <button
                          key={type}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                          onClick={() => {
                            updateBlock(block.id, { type })
                            setShowGripMenu(null)
                          }}
                        >
                          <Icon className="w-5 h-5 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900">{label}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Block content */}
            <div className="relative">
              {getBlockElement(block)}

              {/* Type Menu (no overlay; auto flip) */}
              {showTypeMenu === block.id && (
                <div ref={typeMenuRef} className="relative">
                  <TypeMenu
                    blockId={block.id}
                    onChangeBlockType={(id, t) => {
                      updateBlock(id, { type: t })
                      setShowTypeMenu(null)
                    }}
                    placement={typeMenuPlacement}
                  />
                </div>
              )}
            </div>

            {/* Delete */}
            {!readOnly && activeBlockId === block.id && blocks.length > 1 && (
              <div className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  onClick={() => deleteBlock(block.id)}
                  title="Delete block"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Floating text formatting toolbar */}
      {!readOnly && showTextToolbar && toolbarBlockId && (
        <div
          className="fixed z-20 bg-white border border-gray-200 shadow-lg rounded-md px-1 py-0.5 flex items-center space-x-0.5"
          style={{ left: toolbarPos.x, top: toolbarPos.y, transform: 'translate(-50%, -100%)' }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            className={`p-1 rounded hover:bg-gray-100 ${formatState.bold ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            title="Bold"
            onClick={() => {
              try {
                document.execCommand('bold')
              } catch { }
              const el = blockRefs.current[toolbarBlockId]
              if (el) updateBlock(toolbarBlockId, { content: (el as HTMLElement).innerHTML })
              try {
                setFormatState({
                  bold: document.queryCommandState('bold'),
                  italic: document.queryCommandState('italic'),
                  underline: document.queryCommandState('underline'),
                })
              } catch { }
            }}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            className={`p-1 rounded hover:bg-gray-100 ${formatState.italic ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            title="Italic"
            onClick={() => {
              try {
                document.execCommand('italic')
              } catch { }
              const el = blockRefs.current[toolbarBlockId]
              if (el) updateBlock(toolbarBlockId, { content: (el as HTMLElement).innerHTML })
              try {
                setFormatState({
                  bold: document.queryCommandState('bold'),
                  italic: document.queryCommandState('italic'),
                  underline: document.queryCommandState('underline'),
                })
              } catch { }
            }}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            className={`p-1 rounded hover:bg-gray-100 ${formatState.underline ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            title="Underline"
            onClick={() => {
              try {
                document.execCommand('underline')
              } catch { }
              const el = blockRefs.current[toolbarBlockId]
              if (el) updateBlock(toolbarBlockId, { content: (el as HTMLElement).innerHTML })
              try {
                setFormatState({
                  bold: document.queryCommandState('bold'),
                  italic: document.queryCommandState('italic'),
                  underline: document.queryCommandState('underline'),
                })
              } catch { }
            }}
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100 text-gray-700"
            title="Close"
            onClick={() => setShowTextToolbar(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Block at End */}
      {!readOnly && (
        <div className="mt-4">
          <button
            className="flex items-center space-x-2 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => addBlock(blocks[blocks.length - 1].id)}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Click to add a block</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default DocumentEditor

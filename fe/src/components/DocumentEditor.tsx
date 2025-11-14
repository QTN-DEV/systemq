/**
 * This file is not removed yet, cause the refactor may take sometime until it is ready
 * Eventually, this file will be removed and replaced by the new modular DocumentEditor
 * that is in the components/modules/DocumentEditor folder
 * 
 * This is for reference of the old code, if there exists any bug after the new modular
 * DocumentEditor is used in the document editor page
 * @ganadipa 2025-11
 */
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
  Table,
  Minus,
  Link as LinkIcon,
} from 'lucide-react'
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  type ReactElement,
} from 'react'
import { isAxiosError } from 'axios'
import Swal from 'sweetalert2'

import { logger } from '@/lib/logger'
import { uploadImage, uploadFile, getFileUrl } from '../lib/shared/services/UploadService'
import type {
  DocumentBlock,
  DocumentTableData,
  DocumentTableRow,
  DocumentTableCell,
} from '@/types/documents'
export type { DocumentBlock } from '@/types/documents'

interface DocumentEditorProps {
  initialBlocks?: DocumentBlock[]
  onSave?: (blocks: DocumentBlock[]) => void
  readOnly?: boolean
  title?: string
  onTitleChange?: (title: string) => void
}

/** Global CSS untuk placeholder & konsistensi link */
const PlaceholderStyles = () => (
  <style>{`
  .ce-editable[contenteditable="true"]:empty:before {
    content: attr(data-placeholder);
    color: #9ca3af;
    pointer-events: none;
    opacity: 0.9;
  }
  .ce-editable a {
    color: #2563eb;
    text-decoration: underline;
    text-underline-offset: 2px;
    font-size: inherit;
    line-height: inherit;
    font-weight: inherit;
    word-break: break-word;
  }
  .ce-editable a:hover { color: #1d4ed8; }
  .inline-editor-link { cursor: pointer; }
`}</style>
)

/** Type Menu (tanpa "Link (new block)") */
const TypeMenu = ({
  blockId,
  onChangeBlockType,
  placement = 'bottom',
  onOpenLinkDialog,
}: {
  blockId: string
  onChangeBlockType: (blockId: string, newType: DocumentBlock['type']) => void
  placement?: 'bottom' | 'top'
  onOpenLinkDialog: (blockId: string) => void
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
      { type: 'table' as const, icon: Table, label: 'Table' },
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

    <div className="border-t border-gray-100 my-1" />
    <button
      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
      onClick={() => onOpenLinkDialog(blockId)}
      title="Insert/edit link"
    >
      <LinkIcon className="w-5 h-5 text-gray-400" />
      <div className="text-sm font-medium text-gray-900">Link</div>
    </button>
  </div>
)

const generateId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // ignore and fallback to Math.random
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

const createTableData = (rows = 3, columns = 3): DocumentTableData => {
  const safeRows = Math.max(rows, 1)
  const safeColumns = Math.max(columns, 1)
  return {
    rows: Array.from({ length: safeRows }).map((): DocumentTableRow => ({
      id: generateId(),
      cells: Array.from({ length: safeColumns }).map(
        (): DocumentTableCell => ({
          id: generateId(),
          content: '',
        }),
      ),
    })),
  }
}

const cloneTableData = (
  table: DocumentTableData | undefined,
  fallbackRows = 3,
  fallbackColumns = 3,
): DocumentTableData => {
  if (!table || table.rows.length === 0 || table.rows.some((row) => row.cells.length === 0)) {
    return createTableData(fallbackRows, fallbackColumns)
  }
  return {
    rows: table.rows.map((row) => ({
      id: row.id ?? generateId(),
      cells: row.cells.map((cell) => ({
        id: cell.id ?? generateId(),
        content: cell.content ?? '',
      })),
    })),
  }
}

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
  const tableCellRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const tableCellContentRef = useRef<Record<string, string>>({})
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
  const [formatState, setFormatState] = useState<{ bold: boolean; italic: boolean; underline: boolean }>(
    { bold: false, italic: false, underline: false },
  )

  // Link dialog state
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkDialogText, setLinkDialogText] = useState('')
  const [linkDialogUrl, setLinkDialogUrl] = useState('')
  const [linkDialogBlockId, setLinkDialogBlockId] = useState<string | null>(null)
  const [linkEditAnchor, setLinkEditAnchor] = useState<HTMLAnchorElement | null>(null)

  // Link hover toolbar
  const [showLinkToolbar, setShowLinkToolbar] = useState(false)
  const [linkToolbarPos, setLinkToolbarPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [linkToolbarBlockId, setLinkToolbarBlockId] = useState<string | null>(null)
  const linkToolbarRef = useRef<HTMLDivElement | null>(null)

  /** ---------- Utils ---------- */
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

  const saveSelectionForBlock = (
    blockId: string,
    context?: { element?: HTMLElement; offsets?: { start: number; end: number; backward: boolean } | null },
  ): void => {
    const host = context?.element ?? blockRefs.current[blockId]
    if (!host) return
    const offsets = context?.offsets ?? getSelectionOffsets(host)
    if (!offsets) return
    savedSelectionRef.current = { blockId, ...offsets }
  }

  const createAnchorHTML = (href: string, text?: string) =>
    `<a href="${href}" target="_blank" rel="noopener noreferrer" contenteditable="false" class="inline-editor-link" data-inline-link="1">${text || href}</a>`

  // Normalize <a> di dalam editor agar atribut lengkap
  const normalizeAnchors = (el: HTMLElement): void => {
    const anchors = el.querySelectorAll('a')
    anchors.forEach((a) => {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
      a.setAttribute('contenteditable', 'false')
      a.classList.add('inline-editor-link')
      a.setAttribute('data-inline-link', '1')
    })
  }

  /** ---------- Autosave (debounced, skip identical snapshots) ---------- */
  const lastEmittedSnapshotRef = useRef<string>(JSON.stringify(initialBlocks ?? []))
  useEffect((): (() => void) | void => {
    if (!onSave) return
    const snapshot = JSON.stringify(blocks ?? [])
    if (snapshot === lastEmittedSnapshotRef.current) return
    const tid = setTimeout(() => {
      // Emit only if still different at fire time
      const currentSnapshot = JSON.stringify(blocks ?? [])
      if (currentSnapshot !== lastEmittedSnapshotRef.current) {
        lastEmittedSnapshotRef.current = currentSnapshot
        onSave(blocks)
      }
    }, 1500)
    return () => clearTimeout(tid)
  }, [blocks, onSave])

  /** ---------- Outside click + Esc ---------- */
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent): void => {
      const t = e.target as Node
      if (showGripMenu && !gripMenuRef.current?.contains(t)) setShowGripMenu(null)
      if (showTypeMenu && !typeMenuRef.current?.contains(t)) setShowTypeMenu(null)
      if (showLinkToolbar && !linkToolbarRef.current?.contains(t)) setShowLinkToolbar(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setShowGripMenu(null)
        setShowTypeMenu(null)
        setShowLinkToolbar(false)
      }
    }
    window.addEventListener('mousedown', onDocMouseDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDocMouseDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [showGripMenu, showTypeMenu, showLinkToolbar])

  /** ---------- Auto-flip menus ---------- */
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

  useEffect(() => {
    if (readOnly) return
    let needsUpdate = false
    const nextBlocks = blocks.map((block) => {
      if (block.type !== 'table') return block
      const hasStructure =
        block.table &&
        block.table.rows.length > 0 &&
        block.table.rows.every((row) => row.cells.length > 0)
      if (hasStructure) return block
      needsUpdate = true
      return { ...block, table: createTableData() }
    })
    if (needsUpdate) setBlocks(nextBlocks)
  }, [blocks, readOnly])

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
    const handleUp = (): void => { isSelectingRef.current = false }
    document.addEventListener('mouseup', handleUp)
    return () => { document.removeEventListener('mouseup', handleUp) }
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
  const createBlock = (type: DocumentBlock['type'] = 'paragraph'): DocumentBlock => {
    const block: DocumentBlock = {
      id: generateId(),
      type,
      content: '',
      alignment: 'left',
    }
    if (type === 'table') {
      block.table = createTableData()
    }
    return block
  }

  const addBlock = (afterId: string, type: DocumentBlock['type'] = 'paragraph'): string => {
    const newBlock = createBlock(type)
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
      if (element) {
        element.focus()
        // Scroll the new block into view
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 0)
    return newBlock.id
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

  const changeBlockType = (
    blockId: string,
    newType: DocumentBlock['type'],
    options?: { rows?: number; columns?: number },
  ): void => {
    const target = blocks.find((b) => b.id === blockId)
    const updates: Partial<DocumentBlock> = { type: newType }

    if (newType === 'table') {
      const rows = options?.rows ?? 3
      const columns = options?.columns ?? 3
      const newTable = createTableData(rows, columns)
      updates.content = ''
      updates.alignment = 'left'
      updates.table = newTable
      updates.url = undefined
      updates.fileName = undefined
      updates.fileSize = undefined
      updateBlock(blockId, updates)
      const firstCellId = newTable.rows[0]?.cells[0]?.id
      if (firstCellId) {
        setTimeout(() => {
          const el = tableCellRefs.current[firstCellId]
          if (el) {
            blockRefs.current[blockId] = el
            el.focus()
          }
        }, 0)
      }
      return
    } else {
      updates.table = undefined
      if (target?.type === 'table') {
        const firstCell = target.table?.rows?.[0]?.cells?.[0]
        if (firstCell && typeof firstCell.content === 'string') {
          updates.content = firstCell.content
        }
      }
    }
    updateBlock(blockId, updates)
  }

  const updateTableCell = (blockId: string, cellId: string, value: string): void => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return
    const tableData = cloneTableData(block.table)
    const nextRows = tableData.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) =>
        cell.id === cellId ? { ...cell, content: value } : cell,
      ),
    }))
    updateBlock(blockId, { table: { rows: nextRows } })
  }

  const addTableRow = (blockId: string): void => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return
    const tableData = cloneTableData(block.table)
    const columnCount = tableData.rows[0]?.cells.length ?? 1
    const newRow: DocumentTableRow = {
      id: generateId(),
      cells: Array.from({ length: Math.max(columnCount, 1) }).map(() => ({
        id: generateId(),
        content: '',
      })),
    }
    updateBlock(blockId, { table: { rows: [...tableData.rows, newRow] } })
  }

  const addTableColumn = (blockId: string): void => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return
    const tableData = cloneTableData(block.table)
    const nextRows = tableData.rows.map((row) => ({
      ...row,
      cells: [
        ...row.cells,
        {
          id: generateId(),
          content: '',
        },
      ],
    }))
    updateBlock(blockId, { table: { rows: nextRows } })
  }

  const removeTableRow = (blockId: string): void => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return
    const tableData = cloneTableData(block.table)
    if (tableData.rows.length <= 1) return
    const removed = tableData.rows[tableData.rows.length - 1]
    removed?.cells.forEach((cell) => {
      delete tableCellRefs.current[cell.id]
      delete tableCellContentRef.current[cell.id]
    })
    updateBlock(blockId, { table: { rows: tableData.rows.slice(0, -1) } })
  }

  const removeTableColumn = (blockId: string): void => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return
    const tableData = cloneTableData(block.table)
    const columnCount = tableData.rows[0]?.cells.length ?? 0
    if (columnCount <= 1) return
    const removedCells: string[] = []
    const nextRows = tableData.rows.map((row) => {
      const cells = row.cells.slice(0, -1)
      const removedCell = row.cells[row.cells.length - 1]
      if (removedCell) removedCells.push(removedCell.id)
      return { ...row, cells }
    })
    removedCells.forEach((cellId) => {
      delete tableCellRefs.current[cellId]
      delete tableCellContentRef.current[cellId]
    })
    updateBlock(blockId, { table: { rows: nextRows } })
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

  const insertFilesAsBlocks = (anchorId: string, files: FileList | File[]): void => {
    if (readOnly) return
    const validFiles = Array.from(files).filter((file) => file && file.size > 0)
    if (validFiles.length === 0) return

    const anchorBlock = blocks.find((b) => b.id === anchorId)
    let afterId = anchorId

    validFiles.forEach((file, index) => {
      const blockType: DocumentBlock['type'] = file.type.startsWith('image/') ? 'image' : 'file'
      const canReuseAnchor =
        index === 0 &&
        anchorBlock &&
        ((blockType === 'image' && anchorBlock.type === 'image' && !anchorBlock.url) ||
          (blockType === 'file' && anchorBlock.type === 'file' && !anchorBlock.url))

      if (canReuseAnchor) {
        void handleFileUpload(anchorId, file, blockType, false)
        afterId = anchorId
      } else {
        const newBlockId = addBlock(afterId, blockType)
        afterId = newBlockId
        setTimeout(() => { void handleFileUpload(newBlockId, file, blockType, true) }, 0)
      }
    })
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
    if (readOnly) {
      setDraggedBlockId(null)
      setDragOverBlockId(null)
      return
    }

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      insertFilesAsBlocks(blockId, e.dataTransfer.files)
      setDraggedBlockId(null)
      setDragOverBlockId(null)
      return
    }

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
  const handleFileUpload = async (
    blockId: string,
    file: File,
    preferredType?: DocumentBlock['type'],
    cleanupOnFailure = false,
  ): Promise<void> => {
    if (readOnly) return
    const block = blocks.find((b) => b.id === blockId)
    const inferredFromBlock =
      block?.type === 'image' ? 'image' : block?.type === 'file' ? 'file' : null
    const uploadType: 'image' | 'file' =
      (preferredType === 'image' || preferredType === 'file')
        ? preferredType
        : inferredFromBlock ?? (file.type.startsWith('image/') ? 'image' : 'file')

    setUploadingBlocks((prev) => new Set(prev).add(blockId))
    try {
      const uploadResult = await uploadFileToServer(file, uploadType)
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? {
              ...b,
              type: uploadType,
              url: uploadResult.url,
              fileName: uploadResult.fileName,
              fileSize: uploadResult.fileSize,
              content: uploadType === 'file'
                ? uploadResult.fileName || file.name || b.content
                : b.content || file.name || '',
            }
            : b,
        ),
      )
    } catch (error) {
      logger.error('Upload failed:', error)
      let message = 'Failed to upload file'
      if (isAxiosError(error)) {
        const status = error.response?.status
        if (status === 413) {
          message = 'File is too large. Maximum allowed size is 50 MB.'
        } else if (typeof error.response?.data?.detail === 'string') {
          message = error.response.data.detail
        }
      }
      void Swal.fire({
        toast: true,
        icon: 'error',
        title: message,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      })
      if (cleanupOnFailure) {
        setBlocks((prev) => prev.filter((b) => b.id !== blockId))
      }
    } finally {
      setUploadingBlocks((prev) => {
        const next = new Set(prev)
        next.delete(blockId)
        return next
      })
    }
  }

  /** ---------- Command \/link detection ---------- */
  const handleCommandDetection = (blockId: string, html: string): void => {
    if (readOnly) return
    const text = html.replace(/<[^>]*>/g, '').trim()
    if (text.toLowerCase().startsWith('/link')) {
      setShowLinkDialog(true)
      setLinkDialogBlockId(blockId)
      setLinkDialogText('')
      setLinkDialogUrl('')
      updateBlock(blockId, { content: '' })
    }
    const tableMatch = text.match(/^\/table(?:\s+(\d+)\s*[x×]\s*(\d+))?$/i)
    if (tableMatch) {
      const [, rowsStr, colsStr] = tableMatch
      const rows = rowsStr ? Math.max(parseInt(rowsStr, 10) || 0, 1) : 3
      const columns = colsStr ? Math.max(parseInt(colsStr, 10) || 0, 1) : 3
      changeBlockType(blockId, 'table', { rows, columns })
    }
  }

  /** ---------- Paste handler: selalu inline anchor (no link block) ---------- */
  const handlePaste = (e: React.ClipboardEvent, blockId: string): void => {
    if (readOnly) return
    if (e.clipboardData) {
      const directFiles = Array.from(e.clipboardData.files ?? [])
      let collectedFiles = directFiles
      if (collectedFiles.length === 0 && e.clipboardData.items) {
        collectedFiles = Array.from(e.clipboardData.items)
          .filter((item) => item.kind === 'file')
          .map((item) => item.getAsFile())
          .filter((file): file is File => Boolean(file && file.size > 0))
      }
      if (collectedFiles.length > 0) {
        e.preventDefault()
        insertFilesAsBlocks(blockId, collectedFiles)
        return
      }
    }
    const plain = e.clipboardData.getData('text/plain')
    const urlRegex = /^(https?:\/\/[^\s]+)$/i
    if (urlRegex.test(plain)) {
      e.preventDefault()
      const el = blockRefs.current[blockId]
      if (!el) return

      // Sisipkan anchor HTML supaya inherit font & terdeteksi hover
      try {
        document.execCommand('insertHTML', false, createAnchorHTML(plain))
      } catch {
        // fallback: append
        (el as HTMLElement).insertAdjacentHTML('beforeend', createAnchorHTML(plain))
      }

      normalizeAnchors(el as HTMLElement)
      updateBlock(blockId, { content: (el as HTMLElement).innerHTML })
    }
  }

  /** Cek selection di dalam elemen */
  const isSelectionInside = (element: HTMLElement): boolean => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return false
    const range = sel.getRangeAt(0)
    return element.contains(range.commonAncestorContainer)
  }

  const openLinkDialogForSelection = (blockId: string): void => {
    setLinkEditAnchor(null)
    setShowLinkToolbar(false)
    const host = blockRefs.current[blockId]
    if (!host) return
    const sel = window.getSelection()
    const inside = sel && sel.rangeCount > 0 ? isSelectionInside(host) : false
    if (inside && sel && !sel.isCollapsed) {
      const selectedText = sel.toString()
      setShowLinkDialog(true)
      setLinkDialogBlockId(blockId)
      setLinkDialogText(selectedText)
      setLinkDialogUrl('')
      return
    }
    const textLen = (host.innerText || '').length
    savedSelectionRef.current = { blockId, start: textLen, end: textLen, backward: false }
    setShowLinkDialog(true)
    setLinkDialogBlockId(blockId)
    setLinkDialogText('')
    setLinkDialogUrl('')
  }

  /** Build a Range inside element using plain-text offsets */
  const buildRangeWithin = (element: HTMLElement, start: number, end: number): Range => {
    let charIndex = 0
    let startNode: Text | null = null
    let startOffsetInNode = 0
    let endNode: Text | null = null
    let endOffsetInNode = 0

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)
    let node: Node | null = walker.nextNode()
    while (node) {
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
      node = walker.nextNode()
    }
    const range = document.createRange()
    if (startNode) range.setStart(startNode, startOffsetInNode)
    else range.setStart(element, 0)
    if (endNode) range.setEnd(endNode, endOffsetInNode)
    else range.setEnd(element, element.childNodes.length)
    return range
  }

  /** Replace given range with an anchor element */
  const replaceRangeWithAnchor = (range: Range, href: string, text: string): void => {
    const anchor = document.createElement('a')
    anchor.setAttribute('href', href)
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noopener noreferrer')
    anchor.setAttribute('contenteditable', 'false')
    anchor.classList.add('inline-editor-link')
    anchor.setAttribute('data-inline-link', '1')
    anchor.textContent = text || href
    range.deleteContents()
    range.insertNode(anchor)
  }

  const applyLinkFromDialog = (): void => {
    if (!linkDialogBlockId) { setShowLinkDialog(false); return }
    const blockId = linkDialogBlockId
    const el = blockRefs.current[blockId]
    if (!el) { setShowLinkDialog(false); return }

    const text = linkDialogText.trim() || linkDialogUrl.trim()
    const href = linkDialogUrl.trim()
    if (!href) { setShowLinkDialog(false); return }

    // Edit existing anchor
    if (linkEditAnchor && el.contains(linkEditAnchor)) {
      linkEditAnchor.setAttribute('href', href)
      linkEditAnchor.setAttribute('target', '_blank')
      linkEditAnchor.setAttribute('rel', 'noopener noreferrer')
      linkEditAnchor.setAttribute('contenteditable', 'false')
      linkEditAnchor.classList.add('inline-editor-link')
      linkEditAnchor.setAttribute('data-inline-link', '1')
      if (text) linkEditAnchor.textContent = text
      updateBlock(blockId, { content: (el as HTMLElement).innerHTML })
      setLinkEditAnchor(null)
      setShowLinkDialog(false)
      return
    }

    // Sisipkan inline di selection/end — selalu sebagai paragraph
    const saved = savedSelectionRef.current
    let start = (el as HTMLElement).innerText.length
    let end = start
    if (saved && saved.blockId === blockId) { start = saved.start; end = saved.end }
    try {
      const range = buildRangeWithin(el as HTMLElement, start, end)
      replaceRangeWithAnchor(range, href, text)
    } catch {
      (el as HTMLElement).insertAdjacentHTML('beforeend', createAnchorHTML(href, text))
    }
    normalizeAnchors(el as HTMLElement)
    updateBlock(blockId, { type: 'paragraph', content: (el as HTMLElement).innerHTML })
    setShowLinkDialog(false)
  }

  const handleAnchorClick = (_e: React.MouseEvent, _blockId: string): void => {
    if (readOnly) return
  }

  /** ---------- Link hover toolbar ---------- */
  useEffect(() => {
    if (readOnly) return
    const onMouseOver = (e: MouseEvent): void => {
      const t = e.target as HTMLElement
      const anchor = t?.closest('a') as HTMLAnchorElement | null
      if (!anchor) return
      const host = anchor.closest('.ce-editable') as HTMLElement | null
      if (!host) return
      const blockId = Object.keys(blockRefs.current).find((k) => blockRefs.current[k] === host) || null
      if (!blockId) return
      const rect = anchor.getBoundingClientRect()
      setLinkToolbarPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 })
      setLinkToolbarBlockId(blockId)
      setShowLinkToolbar(true)
      setLinkEditAnchor(anchor)
    }
    const onMouseDown = (e: MouseEvent): void => {
      const t = e.target as Node
      if (linkToolbarRef.current && linkToolbarRef.current.contains(t)) return
      const isAnchor = (t as HTMLElement).closest && (t as HTMLElement).closest('a')
      if (isAnchor) return
      setShowLinkToolbar(false)
    }
    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [readOnly])

  const unlinkAnchor = (): void => {
    if (!linkToolbarBlockId || !linkEditAnchor) { setShowLinkToolbar(false); return }
    const blockId = linkToolbarBlockId
    const el = blockRefs.current[blockId]
    if (!el) { setShowLinkToolbar(false); return }
    const text = linkEditAnchor.textContent || ''
    const span = document.createElement('span')
    span.textContent = text
    linkEditAnchor.replaceWith(span)
    updateBlock(blockId, { content: (el as HTMLElement).innerHTML })
    setShowLinkToolbar(false)
    setLinkEditAnchor(null)
  }

  /** ---------- Keyboard ---------- */
  const handleKeyDown = (e: React.KeyboardEvent, blockId: string): void => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow newline inside current block, then store caret location
        setTimeout(() => {
          saveSelectionForBlock(blockId)
        }, 0)
      } else {
        e.preventDefault()
        addBlock(blockId)
      }
      return
    } else if (e.key === 'Backspace') {
      const block = blocks.find((b) => b.id === blockId)
      if (!block) return
      const host = blockRefs.current[blockId] as HTMLElement | null
      const offsets = host ? getSelectionOffsets(host) : null
      const caretAtStart = offsets ? offsets.start === 0 && offsets.end === 0 : false

      if (block.content === '' && blocks.length > 1) {
        e.preventDefault()
        deleteBlock(blockId)
        return
      }

      if (caretAtStart) {
        const currentIndex = blocks.findIndex((b) => b.id === blockId)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : -1
        if (prevIndex >= 0) {
          const prevBlock = blocks[prevIndex]
          const mergeableTypes: DocumentBlock['type'][] = [
            'paragraph',
            'heading1',
            'heading2',
            'heading3',
            'bulleted-list',
            'numbered-list',
            'quote',
            'code',
          ]
          if (
            mergeableTypes.includes(prevBlock.type) &&
            mergeableTypes.includes(block.type)
          ) {
            e.preventDefault()
            const prevText = prevBlock.content || ''
            const mergedContent = `${prevText}${block.content || ''}`
            const caretPosition = prevText.length
            setBlocks((prev) => {
              const nextBlocks = [...prev]
              nextBlocks[prevIndex] = { ...prevBlock, content: mergedContent }
              nextBlocks.splice(currentIndex, 1)
              return nextBlocks
            })
            setActiveBlockId(prevBlock.id)
            setTimeout(() => {
              const prevEl = blockRefs.current[prevBlock.id]
              if (prevEl) {
                prevEl.focus()
                setSelectionOffsets(
                  prevEl,
                  caretPosition,
                  caretPosition,
                  false,
                )
              }
            }, 0)
          }
        }
      }
    } else if (e.key === 'ArrowUp' && !e.shiftKey) {
      const host = blockRefs.current[blockId] as HTMLElement | null
      const offsets = host ? getSelectionOffsets(host) : null
      if (!offsets || offsets.start !== 0 || offsets.end !== 0) return
      const currentIndex = blocks.findIndex((b) => b.id === blockId)
      if (currentIndex <= 0) return
      const prevBlock = blocks[currentIndex - 1]
      const prevEl = blockRefs.current[prevBlock.id]
      if (!prevEl) return
      e.preventDefault()
      setActiveBlockId(prevBlock.id)
      setTimeout(() => {
        prevEl.focus()
        const length = (prevBlock.content ?? '').length
        if ((prevEl as HTMLElement).isContentEditable) {
          setSelectionOffsets(prevEl as HTMLElement, length, length, false)
        }
      }, 0)
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
      const host = blockRefs.current[blockId] as HTMLElement | null
      const offsets = host ? getSelectionOffsets(host) : null
      const textLength = host?.textContent?.length ?? 0
      if (!offsets || offsets.start !== textLength || offsets.end !== textLength) return
      const currentIndex = blocks.findIndex((b) => b.id === blockId)
      if (currentIndex < 0 || currentIndex >= blocks.length - 1) return
      const nextBlock = blocks[currentIndex + 1]
      const nextEl = blockRefs.current[nextBlock.id]
      if (!nextEl) return
      e.preventDefault()
      setActiveBlockId(nextBlock.id)
      setTimeout(() => {
        nextEl.focus()
        if ((nextEl as HTMLElement).isContentEditable) {
          setSelectionOffsets(nextEl as HTMLElement, 0, 0, false)
        }
      }, 0)
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
      case 'heading1': return 'Heading 1'
      case 'heading2': return 'Heading 2'
      case 'heading3': return 'Heading 3'
      case 'bulleted-list': return 'Bulleted list'
      case 'numbered-list': return 'Numbered list'
      case 'quote': return 'Quote'
      case 'code': return 'Code block'
      case 'image': return 'Enter image URL or upload an image'
      case 'file': return 'Enter file name or upload a file'
      case 'table': return 'Insert table content'
      default: return "Type '/' for commands"
    }
  }

  /** ---------- MIGRASI: ubah block type 'link' (legacy) menjadi paragraph + anchor ---------- */
  useEffect(() => {
    setBlocks((prev) =>
      prev.map((b) => {
        if ((b as any)?.type !== 'link') return b
        const href = (b as any).url || (b as any).content || '#'
        const text = (b as any).content || (b as any).url || 'Link'
        return {
          ...b,
          type: 'paragraph' as DocumentBlock['type'],
          content: createAnchorHTML(href, text),
        } as DocumentBlock
      }),
    )
    // sekali di mount saja
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** ---------- Render block ---------- */
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
              normalizeAnchors(el as unknown as HTMLElement)
            }}
            className={`ce-editable w-full bg-transparent outline-none overflow-hidden min-h-[1.5em] text-left text-gray-900 focus:outline-none ${typeClass}`}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-placeholder={getBlockPlaceholder(block.type)}
            onFocus={(): void => { setActiveBlockId(block.id); saveSelectionForBlock(block.id) }}
            onMouseDown={(): void => { setActiveBlockId(block.id); isSelectingRef.current = true }}
            onKeyUp={() => saveSelectionForBlock(block.id)}
            onClick={(e): void => { handleAnchorClick(e, block.id); saveSelectionForBlock(block.id) }}
            onKeyDown={(e): void => { handleKeyDown(e as any, block.id) }}
            onInput={(e): void => {
              const html = (e.currentTarget as HTMLDivElement).innerHTML
              prevContentRef.current[block.id] = html
              normalizeAnchors(e.currentTarget as HTMLDivElement)
              updateBlock(block.id, { content: (e.currentTarget as HTMLDivElement).innerHTML })
              handleCommandDetection(block.id, html)
            }}
            onPaste={(e): void => handlePaste(e, block.id)}
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
                normalizeAnchors(el as unknown as HTMLElement)
              }}
              className="ce-editable flex-1 w-full bg-transparent outline-none overflow-hidden min-h-[1.5em] text-left text-gray-900 focus:outline-none"
              contentEditable={!readOnly}
              suppressContentEditableWarning
              data-placeholder={getBlockPlaceholder(block.type)}
              onFocus={(): void => { setActiveBlockId(block.id); saveSelectionForBlock(block.id) }}
              onMouseDown={() => { setActiveBlockId(block.id); isSelectingRef.current = true }}
              onKeyUp={() => saveSelectionForBlock(block.id)}
              onClick={(e): void => { handleAnchorClick(e, block.id); saveSelectionForBlock(block.id) }}
              onKeyDown={(e): void => { handleKeyDown(e as any, block.id) }}
              onInput={(e): void => {
                const html = (e.currentTarget as HTMLDivElement).innerHTML
                prevContentRef.current[block.id] = html
                normalizeAnchors(e.currentTarget as HTMLDivElement)
                updateBlock(block.id, { content: (e.currentTarget as HTMLDivElement).innerHTML })
                handleCommandDetection(block.id, html)
              }}
              onPaste={(e): void => handlePaste(e, block.id)}
            />
          </div>
        )
      }

      case 'table': {
        const tableData = cloneTableData(block.table)
        const rowCount = tableData.rows.length
        const columnCount = tableData.rows[0]?.cells.length ?? 0

        return (
          <div className="space-y-2">
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full bg-white">
                <tbody>
                  {tableData.rows.map((row, rowIndex) => (
                    <tr key={row.id ?? `row-${rowIndex}`}>
                      {row.cells.map((cell, cellIndex) => (
                        <td
                          key={cell.id ?? `cell-${cellIndex}`}
                          className="border border-gray-200 align-top p-0"
                        >
                          <div
                            ref={(el): void => {
                              if (el) {
                                tableCellRefs.current[cell.id] = el
                                const currentValue = cell.content ?? ''
                                if (tableCellContentRef.current[cell.id] !== currentValue) {
                                  el.textContent = currentValue
                                  tableCellContentRef.current[cell.id] = currentValue
                                }
                              } else {
                                delete tableCellRefs.current[cell.id]
                              }
                            }}
                            className={`ce-editable w-full min-h-[2.5rem] px-3 py-2 text-sm outline-none ${
                              readOnly ? 'bg-gray-50 cursor-default text-gray-700' : 'bg-white text-gray-900'
                            }`}
                            contentEditable={!readOnly}
                            suppressContentEditableWarning
                            data-placeholder="Type to add text"
                            onFocus={(e): void => {
                              blockRefs.current[block.id] = e.currentTarget
                              setActiveBlockId(block.id)
                            }}
                            onMouseDown={() => {
                              setActiveBlockId(block.id)
                              isSelectingRef.current = true
                            }}
                            onKeyUp={() => saveSelectionForBlock(block.id)}
                            onInput={(e): void => {
                              const textValue = e.currentTarget.textContent ?? ''
                              tableCellContentRef.current[cell.id] = textValue
                              updateTableCell(block.id, cell.id, textValue)
                              const offsets = getSelectionOffsets(e.currentTarget as HTMLElement)
                              saveSelectionForBlock(block.id, { element: e.currentTarget as HTMLElement, offsets })
                            }}
                            onCopy={(e): void => {
                              // Allow default copy behavior for table cells
                              e.stopPropagation()
                            }}
                            onPaste={(e): void => {
                              // Allow default paste behavior for table cells
                              e.stopPropagation()
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!readOnly && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="text-gray-500">
                  {rowCount} row{rowCount !== 1 ? 's' : ''} · {columnCount} column{columnCount !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 font-medium text-gray-600 hover:bg-gray-50"
                    onClick={() => addTableRow(block.id)}
                  >
                    <Plus className="h-3 w-3" />
                    Row
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 font-medium text-gray-600 hover:bg-gray-50"
                    onClick={() => addTableColumn(block.id)}
                  >
                    <Plus className="h-3 w-3" />
                    Column
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => removeTableRow(block.id)}
                    disabled={rowCount <= 1}
                  >
                    <Minus className="h-3 w-3" />
                    Row
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => removeTableColumn(block.id)}
                    disabled={columnCount <= 1}
                  >
                    <Minus className="h-3 w-3" />
                    Column
                  </button>
                </div>
              </div>
            )}
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
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${imageAlignment === 'left' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                      onClick={() => updateBlock(block.id, { alignment: 'left' })}
                      title="Align left"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${imageAlignment === 'center' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                      onClick={() => updateBlock(block.id, { alignment: 'center' })}
                      title="Align center"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${imageAlignment === 'right' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
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
                        if (file) void handleFileUpload(block.id, file, block.type, false)
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
                        if (file) void handleFileUpload(block.id, file, block.type, false)
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

      // default: paragraph (contentEditable)
      default:
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
              normalizeAnchors(el as unknown as HTMLElement)
            }}
            className="ce-editable w-full bg-transparent outline-none overflow-hidden min-h-[1.5em] text-left text-gray-900 focus:outline-none"
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-placeholder={getBlockPlaceholder(block.type)}
            onFocus={(): void => { setActiveBlockId(block.id); saveSelectionForBlock(block.id) }}
            onMouseDown={() => { setActiveBlockId(block.id); isSelectingRef.current = true }}
            onKeyUp={() => saveSelectionForBlock(block.id)}
            onClick={(e): void => { handleAnchorClick(e, block.id); saveSelectionForBlock(block.id) }}
            onKeyDown={(e): void => { handleKeyDown(e as any, block.id) }}
            onInput={(e): void => {
              const html = (e.currentTarget as HTMLDivElement).innerHTML
              prevContentRef.current[block.id] = html
              normalizeAnchors(e.currentTarget as HTMLDivElement)
              updateBlock(block.id, { content: (e.currentTarget as HTMLDivElement).innerHTML })
              handleCommandDetection(block.id, html)
            }}
            onPaste={(e): void => handlePaste(e, block.id)}
          />
        )
    }
  }

  // Sinkronisasi toolbar text
  useEffect(() => {
    if (readOnly) return
    const onSelectionChange = (): void => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setShowTextToolbar(false)
        setToolbarBlockId(null)
        return
      }
      const range = sel.getRangeAt(0)
      const containerEl = range.commonAncestorContainer instanceof Element
        ? (range.commonAncestorContainer as Element)
        : range.commonAncestorContainer.parentElement
      if (!containerEl) return
      const host = containerEl.closest('.ce-editable') as HTMLElement | null
      if (!host) {
        setShowTextToolbar(false)
        setToolbarBlockId(null)
        return
      }
      const blockId = Object.keys(blockRefs.current).find((k) => blockRefs.current[k] === host) || null
      if (!blockId) {
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
      setToolbarBlockId(blockId)
      setShowTextToolbar(true)
      try {
        setFormatState({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
        })
      } catch { }
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [readOnly])

  return (
    <div className="w-full">
      <PlaceholderStyles />

      {/* Blocks */}
      <div className="space-y-2">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`group relative transition-all duration-200 ${dragOverBlockId === block.id ? 'border-t-2 border-blue-400' : ''} ${draggedBlockId === block.id ? 'opacity-50' : ''}`}
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

                  {/* Grip Menu */}
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
                      { type: 'table' as const, icon: Table, label: 'Table' },
                    ].map(({ type, icon: Icon, label }) => (
                      <button
                        key={type}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                        onClick={() => {
                          changeBlockType(block.id, type)
                          setShowGripMenu(null)
                        }}
                      >
                        <Icon className="w-5 h-5 text-gray-400" />
                        <div className="text-sm font-medium text-gray-900">{label}</div>
                      </button>
                    ))}
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                        onClick={() => {
                          changeBlockType(block.id, 'paragraph')
                          setShowGripMenu(null)
                          openLinkDialogForSelection(block.id)
                        }}
                        title="Insert/edit link"
                      >
                        <LinkIcon className="w-5 h-5 text-gray-400" />
                        <div className="text-sm font-medium text-gray-900">Link</div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Block content */}
            <div className="relative">
              {getBlockElement(block)}

              {/* Type Menu */}
              {showTypeMenu === block.id && (
                <div ref={typeMenuRef} className="relative">
                  <TypeMenu
                    blockId={block.id}
                    onChangeBlockType={(id, t) => {
                      changeBlockType(id, t)
                      setShowTypeMenu(null)
                    }}
                    placement={typeMenuPlacement}
                    onOpenLinkDialog={(id) => {
                      changeBlockType(id, 'paragraph')
                      setShowTypeMenu(null)
                      openLinkDialogForSelection(id)
                    }}
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
            className={`p-1 rounded hover:bg-gray-100 ${formatState.bold ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
            title="Bold"
            onClick={() => {
              try { document.execCommand('bold') } catch { }
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
            className={`p-1 rounded hover:bg-gray-100 ${formatState.italic ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
            title="Italic"
            onClick={() => {
              try { document.execCommand('italic') } catch { }
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
            className={`p-1 rounded hover:bg-gray-100 ${formatState.underline ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
            title="Underline"
            onClick={() => {
              try { document.execCommand('underline') } catch { }
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

      {/* Floating link toolbar (hover on anchors) */}
      {!readOnly && showLinkToolbar && linkToolbarBlockId && (
        <div
          ref={linkToolbarRef}
          className="fixed z-30 bg-white border border-gray-200 shadow-lg rounded-md px-1 py-0.5 flex items-center space-x-0.5"
          style={{ left: linkToolbarPos.x, top: linkToolbarPos.y, transform: 'translate(-50%, 0%)' }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            className="p-1 rounded hover:bg-gray-100 text-gray-700"
            title="Edit link (change text / URL)"
            onClick={() => {
              if (!linkToolbarBlockId || !linkEditAnchor) return
              setShowLinkToolbar(false)
              setShowLinkDialog(true)
              setLinkDialogBlockId(linkToolbarBlockId)
              setLinkDialogText(linkEditAnchor.textContent || '')
              setLinkDialogUrl(linkEditAnchor.getAttribute('href') || '')
            }}
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100 text-gray-700"
            title="Remove link"
            onClick={() => unlinkAnchor()}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Link Dialog — tetap */}
      {!readOnly && showLinkDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setShowLinkDialog(false); setLinkEditAnchor(null) }} />
          <div className="relative bg-white w-96 max-w-[95vw] border border-gray-200 rounded-lg shadow-xl p-4 z-50">
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Text</div>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={linkDialogText}
                onChange={(e) => setLinkDialogText(e.target.value)}
                placeholder="Link text"
              />
            </div>
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Link</div>
              <input
                type="url"
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={linkDialogUrl}
                onChange={(e) => setLinkDialogUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => { setShowLinkDialog(false); setLinkEditAnchor(null) }}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                onClick={() => applyLinkFromDialog()}
                disabled={!linkDialogUrl.trim()}
              >
                Save
              </button>
            </div>
          </div>
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

import { useState, useRef, useEffect } from 'react'

import type { DocumentBlock } from '@/types/documents'

import { DEFAULT_TABLE_ROWS, DEFAULT_TABLE_COLUMNS } from '../_constants'
import { generateId, createTableData } from '../_utils'
// import type { TableCellRefs } from '../_types'

export const useBlockManagement = (
  initialBlocks: DocumentBlock[], 
  readOnly: boolean,
): {
  blocks: DocumentBlock[]
  setBlocks: React.Dispatch<React.SetStateAction<DocumentBlock[]>>
  activeBlockId: string | null
  setActiveBlockId: (id: string | null) => void
  blockRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>
  prevContentRef: React.MutableRefObject<{ [key: string]: string }>
  createBlock: (type?: DocumentBlock['type']) => DocumentBlock
  addBlock: (afterId: string, type?: DocumentBlock['type']) => string
  updateBlock: (id: string, updates: Partial<DocumentBlock>) => void
  deleteBlock: (id: string) => void
  moveBlock: (fromId: string, toId: string) => void
  changeBlockType: (blockId: string, newType: DocumentBlock['type'], options?: { rows?: number; columns?: number }) => void
} => {
  const [blocks, setBlocks] = useState<DocumentBlock[]>(
    initialBlocks.length > 0
      ? initialBlocks
      : [{ id: '1', type: 'paragraph', content: '', alignment: 'left' }],
  )
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const blockRefs = useRef<{ [key: string]: HTMLElement | null }>({})
  const prevContentRef = useRef<{ [key: string]: string }>({})

  // Ensure all table blocks have proper structure
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

  // Log block content whenever state is updated
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[Blocks State Updated]', blocks.map((block) => ({
      id: block.id,
      type: block.type,
      content: block.content,
    })))
  }, [blocks])

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
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 0)
    return newBlock.id
  }

  const updateBlock = (id: string, updates: Partial<DocumentBlock>): void => {
    const newBlocks = blocks.map((block) => (block.id === id ? { ...block, ...updates } : block))
    setBlocks(newBlocks)
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

  const changeBlockType = (
    blockId: string,
    newType: DocumentBlock['type'],
    options?: { rows?: number; columns?: number },
  ): void => {
    const target = blocks.find((b) => b.id === blockId)
    if (!target) return

    const updates: Partial<DocumentBlock> = { type: newType }

    // Text-based block types that can preserve content
    const textBasedTypes: DocumentBlock['type'][] = [
      'paragraph',
      'heading1',
      'heading2',
      'heading3',
      'bulleted-list',
      'numbered-list',
      'quote',
      'code',
    ]

    if (newType === 'table') {
      const rows = options?.rows ?? DEFAULT_TABLE_ROWS
      const columns = options?.columns ?? DEFAULT_TABLE_COLUMNS
      const newTable = createTableData(rows, columns)
      updates.content = ''
      updates.alignment = 'left'
      updates.table = newTable
      updates.url = undefined
      updates.fileName = undefined
      updates.fileSize = undefined
      updateBlock(blockId, updates)
      return
    } else {
      updates.table = undefined
      
      // Handle conversion from table to text-based type
      if (target.type === 'table') {
        const firstCell = target.table?.rows?.[0]?.cells?.[0]
        if (firstCell && typeof firstCell.content === 'string') {
          updates.content = firstCell.content
        }
      }
      // Preserve content when converting between text-based types
      else if (
        textBasedTypes.includes(target.type) &&
        textBasedTypes.includes(newType) &&
        target.content
      ) {
        // Preserve the existing content
        updates.content = target.content
      }
      // When converting from non-text types (image, file) to text types, keep content empty
      // unless there's existing content that makes sense
    }
    
    updateBlock(blockId, updates)
  }

  return {
    blocks,
    setBlocks,
    activeBlockId,
    setActiveBlockId,
    blockRefs,
    prevContentRef,
    createBlock,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    changeBlockType,
  }
}

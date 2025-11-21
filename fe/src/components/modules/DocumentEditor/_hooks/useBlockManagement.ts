import { useState, useRef, useEffect } from 'react'

import type { DocumentBlock } from '@/types/documents'

import { DEFAULT_TABLE_ROWS, DEFAULT_TABLE_COLUMNS } from '../_constants'
import { generateId, createTableData } from '../_utils'
// import type { TableCellRefs } from '../_types'

export const useBlockManagement = (
  initialBlocks: DocumentBlock[], 
  readOnly: boolean,
) => {
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
    // eslint-disable-next-line no-console
    console.log('[updateBlockInternal] Called for block:', id, 'Updates:', { ...updates, content: updates.content?.substring(0, 100) })
    const currentBlock = blocks.find((b) => b.id === id)
    // eslint-disable-next-line no-console
    console.log('[updateBlockInternal] Current block content:', currentBlock?.content?.substring(0, 100))
    const newBlocks = blocks.map((block) => (block.id === id ? { ...block, ...updates } : block))
    const updatedBlock = newBlocks.find((b) => b.id === id)
    // eslint-disable-next-line no-console
    console.log('[updateBlockInternal] New block content:', updatedBlock?.content?.substring(0, 100), 'Contains <br>:', updatedBlock?.content?.includes('<br>'))
    // eslint-disable-next-line no-console
    console.log('[updateBlockInternal] Calling setBlocks with', newBlocks.length, 'blocks')
    setBlocks(newBlocks)
    // eslint-disable-next-line no-console
    console.log('[updateBlockInternal] setBlocks called')
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
    const updates: Partial<DocumentBlock> = { type: newType }

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
      if (target?.type === 'table') {
        const firstCell = target.table?.rows?.[0]?.cells?.[0]
        if (firstCell && typeof firstCell.content === 'string') {
          updates.content = firstCell.content
        }
      }
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

import { useRef } from 'react'

import type { DocumentBlock, DocumentTableRow } from '@/types/documents'

import type { TableCellRefs } from '../_types'
import { cloneTableData, generateId } from '../_utils'

export const useTableManagement = () => {
  const tableCellRefs = useRef<TableCellRefs>({})
  const tableCellContentRef = useRef<Record<string, string>>({})

  const updateTableCell = (
    block: DocumentBlock,
    cellId: string,
    value: string,
    updateBlock: (id: string, updates: Partial<DocumentBlock>) => void,
  ): void => {
    if (!block) return
    const tableData = cloneTableData(block.table)
    const nextRows = tableData.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) =>
        cell.id === cellId ? { ...cell, content: value } : cell,
      ),
    }))
    updateBlock(block.id, { table: { rows: nextRows } })
  }

  const addTableRow = (
    block: DocumentBlock,
    updateBlock: (id: string, updates: Partial<DocumentBlock>) => void,
  ): void => {
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
    updateBlock(block.id, { table: { rows: [...tableData.rows, newRow] } })
  }

  const addTableColumn = (
    block: DocumentBlock,
    updateBlock: (id: string, updates: Partial<DocumentBlock>) => void,
  ): void => {
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
    updateBlock(block.id, { table: { rows: nextRows } })
  }

  const removeTableRow = (
    block: DocumentBlock,
    updateBlock: (id: string, updates: Partial<DocumentBlock>) => void,
  ): void => {
    if (!block) return
    const tableData = cloneTableData(block.table)
    if (tableData.rows.length <= 1) return
    const removed = tableData.rows[tableData.rows.length - 1]
    removed?.cells.forEach((cell) => {
      delete tableCellRefs.current[cell.id]
      delete tableCellContentRef.current[cell.id]
    })
    updateBlock(block.id, { table: { rows: tableData.rows.slice(0, -1) } })
  }

  const removeTableColumn = (
    block: DocumentBlock,
    updateBlock: (id: string, updates: Partial<DocumentBlock>) => void,
  ): void => {
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
    updateBlock(block.id, { table: { rows: nextRows } })
  }

  return {
    tableCellRefs,
    tableCellContentRef,
    updateTableCell,
    addTableRow,
    addTableColumn,
    removeTableRow,
    removeTableColumn,
  }
}

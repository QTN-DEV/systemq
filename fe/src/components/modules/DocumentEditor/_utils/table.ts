import type { DocumentTableData, DocumentTableRow, DocumentTableCell } from '@/types/documents'

import { generateId } from './idGenerator'

export const createTableData = (rows = 3, columns = 3): DocumentTableData => {
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

export const cloneTableData = (
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

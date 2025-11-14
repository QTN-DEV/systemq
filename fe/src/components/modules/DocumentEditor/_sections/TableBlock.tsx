import type { ReactElement } from 'react'
import { Plus, Minus } from 'lucide-react'
import type { DocumentBlock } from '@/types/documents'
import { cloneTableData } from '../_utils/table'
import { getSelectionOffsets } from '../_utils/selection'
import type { TableCellRefs } from '../_types'

interface TableBlockProps {
  block: DocumentBlock
  readOnly: boolean
  tableCellRefs: React.MutableRefObject<TableCellRefs>
  tableCellContentRef: React.MutableRefObject<Record<string, string>>
  setActiveBlockId: (id: string) => void
  isSelectingRef: React.MutableRefObject<boolean>
  saveSelectionForBlock: (blockId: string, context?: { element?: HTMLElement; offsets?: { start: number; end: number; backward: boolean } | null }) => void
  updateTableCell: (blockId: string, cellId: string, value: string) => void
  addTableRow: (blockId: string) => void
  addTableColumn: (blockId: string) => void
  removeTableRow: (blockId: string) => void
  removeTableColumn: (blockId: string) => void
}

export const TableBlock = ({
  block,
  readOnly,
  tableCellRefs,
  tableCellContentRef,
  setActiveBlockId,
  isSelectingRef,
  saveSelectionForBlock,
  updateTableCell,
  addTableRow,
  addTableColumn,
  removeTableRow,
  removeTableColumn,
}: TableBlockProps): ReactElement => {
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
                      onFocus={(): void => {
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

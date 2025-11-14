// Block rendering helper - extracts block element rendering logic
import type { ReactElement } from 'react'
import type { DocumentBlock } from '@/types/documents'
import {
  Plus,
  Image,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
} from 'lucide-react'
import { cloneTableData, normalizeAnchors, getSelectionOffsets } from '../_utils'

interface RenderBlockContentProps {
  block: DocumentBlock
  blocks: DocumentBlock[]
  readOnly: boolean
  blockRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>
  prevContentRef: React.MutableRefObject<{ [key: string]: string }>
  tableCellRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  tableCellContentRef: React.MutableRefObject<Record<string, string>>
  uploadingBlocks: Set<string>
  hoveredImageId: string | null
  isSelectingRef: React.MutableRefObject<boolean>
  setActiveBlockId: (id: string | null) => void
  setHoveredImageId: (id: string | null) => void
  saveSelectionForBlock: (
    blockId: string,
    context?: {
      element?: HTMLElement
      offsets?: { start: number; end: number; backward: boolean } | null
    },
  ) => void
  handleAnchorClick: (e: React.MouseEvent, blockId: string) => void
  handleKeyDown: (e: React.KeyboardEvent, blockId: string) => void
  updateBlock: (id: string, updates: Partial<DocumentBlock>) => void
  handleCommandDetection: (blockId: string, html: string) => void
  handlePaste: (e: React.ClipboardEvent, blockId: string) => void
  getBlockPlaceholder: (type: DocumentBlock['type']) => string
  updateTableCell: (blockId: string, cellId: string, value: string) => void
  addTableRow: (blockId: string) => void
  addTableColumn: (blockId: string) => void
  removeTableRow: (blockId: string) => void
  removeTableColumn: (blockId: string) => void
  handleFileUpload: (
    blockId: string,
    file: File,
    preferredType?: DocumentBlock['type'],
    cleanupOnFailure?: boolean,
    blocks?: DocumentBlock[],
  ) => Promise<void>
}

export function renderBlockContent(props: RenderBlockContentProps): ReactElement {
  const {
    block,
    blocks,
    readOnly,
    blockRefs,
    prevContentRef,
    tableCellRefs,
    tableCellContentRef,
    uploadingBlocks,
    hoveredImageId,
    isSelectingRef,
    setActiveBlockId,
    setHoveredImageId,
    saveSelectionForBlock,
    handleAnchorClick,
    handleKeyDown,
    updateBlock,
    handleCommandDetection,
    handlePaste,
    getBlockPlaceholder,
    updateTableCell,
    addTableRow,
    addTableColumn,
    removeTableRow,
    removeTableColumn,
    handleFileUpload,
  } = props

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
          onFocus={(): void => {
            setActiveBlockId(block.id)
            saveSelectionForBlock(block.id)
          }}
          onMouseDown={(): void => {
            setActiveBlockId(block.id)
            isSelectingRef.current = true
          }}
          onKeyUp={() => saveSelectionForBlock(block.id)}
          onClick={(e): void => {
            handleAnchorClick(e, block.id)
            saveSelectionForBlock(block.id)
          }}
          onKeyDown={(e): void => {
            handleKeyDown(e as any, block.id)
          }}
          onInput={(e): void => {
            const html = (e.currentTarget as HTMLDivElement).innerHTML
            prevContentRef.current[block.id] = html
            normalizeAnchors(e.currentTarget as HTMLDivElement)
            updateBlock(block.id, {
              content: (e.currentTarget as HTMLDivElement).innerHTML,
            })
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
              i <= blocks.findIndex((b) => b.id === block.id) && b.type === 'numbered-list',
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
            onFocus={(): void => {
              setActiveBlockId(block.id)
              saveSelectionForBlock(block.id)
            }}
            onMouseDown={() => {
              setActiveBlockId(block.id)
              isSelectingRef.current = true
            }}
            onKeyUp={() => saveSelectionForBlock(block.id)}
            onClick={(e): void => {
              handleAnchorClick(e, block.id)
              saveSelectionForBlock(block.id)
            }}
            onKeyDown={(e): void => {
              handleKeyDown(e as any, block.id)
            }}
            onInput={(e): void => {
              const html = (e.currentTarget as HTMLDivElement).innerHTML
              prevContentRef.current[block.id] = html
              normalizeAnchors(e.currentTarget as HTMLDivElement)
              updateBlock(block.id, {
                content: (e.currentTarget as HTMLDivElement).innerHTML,
              })
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
                            readOnly
                              ? 'bg-gray-50 cursor-default text-gray-700'
                              : 'bg-white text-gray-900'
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
                            saveSelectionForBlock(block.id, {
                              element: e.currentTarget as HTMLElement,
                              offsets,
                            })
                          }}
                          onCopy={(e): void => {
                            e.stopPropagation()
                          }}
                          onPaste={(e): void => {
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
                {rowCount} row{rowCount !== 1 ? 's' : ''} · {columnCount} column
                {columnCount !== 1 ? 's' : ''}
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
                      if (file) void handleFileUpload(block.id, file, block.type, false, blocks)
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
                      if (file) void handleFileUpload(block.id, file, block.type, false, blocks)
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

    // default: paragraph
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
          onFocus={(): void => {
            setActiveBlockId(block.id)
            saveSelectionForBlock(block.id)
          }}
          onMouseDown={() => {
            setActiveBlockId(block.id)
            isSelectingRef.current = true
          }}
          onKeyUp={() => saveSelectionForBlock(block.id)}
          onClick={(e): void => {
            handleAnchorClick(e, block.id)
            saveSelectionForBlock(block.id)
          }}
          onKeyDown={(e): void => {
            handleKeyDown(e as any, block.id)
          }}
          onInput={(e): void => {
            const html = (e.currentTarget as HTMLDivElement).innerHTML
            prevContentRef.current[block.id] = html
            normalizeAnchors(e.currentTarget as HTMLDivElement)
            updateBlock(block.id, {
              content: (e.currentTarget as HTMLDivElement).innerHTML,
            })
            handleCommandDetection(block.id, html)
          }}
          onPaste={(e): void => handlePaste(e, block.id)}
        />
      )
  }
}

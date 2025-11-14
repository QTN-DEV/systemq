import { type ReactElement, useEffect, useLayoutEffect, useRef } from 'react'
import { Plus, GripVertical, X } from 'lucide-react'

import type { DocumentEditorProps } from './_types'
import { PlaceholderStyles, BlockRenderer, GripMenu, TypeMenu, TextToolbar, LinkToolbar, LinkDialog } from './_components'
import {
  useBlockManagement,
  useTableManagement,
  useFileUpload,
  useAutosave,
  useMenuState,
  useDragAndDrop,
  useTextFormatting,
  useLinkManagement,
  useSelection,
  useImageState,
  useKeyboardHandlers,
  useCommandDetection,
} from './_hooks'
import { getBlockPlaceholder, createAnchorHTML, normalizeAnchors, setSelectionOffsets, getSelectionOffsets } from './_utils'
import type { DocumentBlock } from '@/types/documents'

export type { DocumentBlock } from '@/types/documents'

function DocumentEditorModular({
  initialBlocks = [],
  onSave,
  readOnly = false,
}: DocumentEditorProps): ReactElement {
  // Flag to skip selection restoration after Shift+Enter
  const skipNextSelectionRestore = useRef(false)
  
  // Table management (initialized first to get refs)
  const {
    tableCellRefs,
    tableCellContentRef,
    updateTableCell: updateTableCellFn,
    addTableRow: addTableRowFn,
    addTableColumn: addTableColumnFn,
    removeTableRow: removeTableRowFn,
    removeTableColumn: removeTableColumnFn,
  } = useTableManagement()

  // Block management (needs tableCellRefs but not savedSelectionRef initially)
  const {
    blocks,
    setBlocks,
    activeBlockId,
    setActiveBlockId,
    blockRefs,
    prevContentRef,
    addBlock,
    updateBlock: updateBlockInternal,
    deleteBlock,
    moveBlock,
    changeBlockType: changeBlockTypeInternal,
  } = useBlockManagement(initialBlocks, readOnly, tableCellRefs)

  // Selection (needs blocks for useLayoutEffect)
  const { savedSelectionRef, isSelectingRef, saveSelectionForBlock } = useSelection(blocks)

  // Wrapper for updateBlock that saves selection
  const updateBlock = (id: string, updates: Partial<DocumentBlock>): void => {
    const el = blockRefs.current[id] || null
    const isContentUpdate = Object.prototype.hasOwnProperty.call(updates, 'content')
    
    // Save selection before updating content to preserve cursor position
    if (isContentUpdate && el && document.activeElement === el && (el as HTMLElement).isContentEditable) {
      const offsets = getSelectionOffsets(el as HTMLElement)
      if (offsets) {
        savedSelectionRef.current = { blockId: id, ...offsets }
      }
    }
    
    updateBlockInternal(id, updates)
  }

  // Wrapper for changeBlockType that handles table cell focus
  const changeBlockType = (
    blockId: string,
    newType: DocumentBlock['type'],
    options?: { rows?: number; columns?: number },
  ): void => {
    changeBlockTypeInternal(blockId, newType, options)
    
    // Focus on first table cell after creation
    if (newType === 'table') {
      setTimeout(() => {
        const block = blocks.find((b) => b.id === blockId)
        const firstCellId = block?.table?.rows?.[0]?.cells?.[0]?.id
        if (firstCellId && tableCellRefs) {
          const firstCellEl = tableCellRefs.current[firstCellId]
          if (firstCellEl) {
            blockRefs.current[blockId] = firstCellEl
            firstCellEl.focus()
          }
        }
      }, 100)
    }
  }

  const saveSelection = (blockId: string, context?: { element?: HTMLElement; offsets?: { start: number; end: number; backward: boolean } | null }) => {
    saveSelectionForBlock(blockId, blockRefs.current, context)
  }

  // File upload
  const { uploadingBlocks, handleFileUpload, insertFilesAsBlocks } = useFileUpload(
    blocks,
    setBlocks,
    readOnly,
    addBlock,
  )

  // Image state
  const { hoveredImageId, setHoveredImageId } = useImageState()

  // Menu state
  const {
    showTypeMenu,
    setShowTypeMenu,
    showGripMenu,
    setShowGripMenu,
    gripMenuRef,
    typeMenuRef,
    gripMenuPlacement,
    typeMenuPlacement,
  } = useMenuState()

  // Drag and drop
  const {
    draggedBlockId,
    dragOverBlockId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop: handleDropDnd,
    handleDragEnd,
  } = useDragAndDrop(readOnly, moveBlock, insertFilesAsBlocks)

  // Text formatting
  const {
    showTextToolbar,
    setShowTextToolbar,
    toolbarPos,
    toolbarBlockId,
    formatState,
    handleFormat,
  } = useTextFormatting(readOnly, blockRefs, updateBlock)

  // Link management
  const {
    showLinkDialog,
    setShowLinkDialog,
    linkDialogText,
    setLinkDialogText,
    linkDialogUrl,
    setLinkDialogUrl,
    linkDialogBlockId,
    setLinkDialogBlockId,
    showLinkToolbar,
    linkToolbarPos,
    linkToolbarBlockId,
    linkToolbarRef,
    openLinkDialogForSelection,
    applyLinkFromDialog,
    unlinkAnchor,
    openLinkEditDialog,
    closeLinkDialog,
  } = useLinkManagement(readOnly, blockRefs, savedSelectionRef, updateBlock)

  // Command detection
  const { handleCommandDetection } = useCommandDetection({
    readOnly,
    setShowLinkDialog,
    setLinkDialogBlockId,
    setLinkDialogText,
    setLinkDialogUrl,
    updateBlock,
    changeBlockType,
  })

  // Keyboard handlers
  const { handleKeyDown } = useKeyboardHandlers({
    blocks,
    setBlocks,
    setActiveBlockId,
    blockRefs,
    addBlock,
    deleteBlock,
    setShowTypeMenu,
    saveSelectionForBlock: saveSelection,
    savedSelectionRef,
    skipNextSelectionRestore,
  })

  // Autosave
  useAutosave(blocks, onSave, initialBlocks)

  // Keep caret position on re-render
  useLayoutEffect(() => {
    // Skip restoration if flag is set (e.g., after Shift+Enter)
    if (skipNextSelectionRestore.current) {
      skipNextSelectionRestore.current = false
      return
    }
    
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
  }, [blocks, blockRefs, savedSelectionRef])

  // Migrate legacy 'link' blocks to paragraph with anchor
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAnchorClick = (_e: React.MouseEvent, _blockId: string): void => {
    if (readOnly) return
  }

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

      try {
        document.execCommand('insertHTML', false, createAnchorHTML(plain))
      } catch {
        ;(el as HTMLElement).insertAdjacentHTML('beforeend', createAnchorHTML(plain))
      }

      normalizeAnchors(el as HTMLElement)
      updateBlock(blockId, { content: (el as HTMLElement).innerHTML })
    }
  }

  const handleDrop = (e: React.DragEvent, blockId: string): void => {
    e.preventDefault()
    if (readOnly) {
      handleDragEnd()
      return
    }

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      insertFilesAsBlocks(blockId, e.dataTransfer.files)
      handleDragEnd()
      return
    }

    handleDropDnd(e, blockId)
  }

  // Wrapper functions for table operations
  const updateTableCell = (blockId: string, cellId: string, value: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (block) updateTableCellFn(block, cellId, value, updateBlock)
  }

  const addTableRow = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (block) addTableRowFn(block, updateBlock)
  }

  const addTableColumn = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (block) addTableColumnFn(block, updateBlock)
  }

  const removeTableRow = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (block) removeTableRowFn(block, updateBlock)
  }

  const removeTableColumn = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (block) removeTableColumnFn(block, updateBlock)
  }

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

                  {showGripMenu === block.id && (
                    <div ref={gripMenuRef}>
                      <GripMenu
                        blockId={block.id}
                        onChangeBlockType={(id, type) => {
                          changeBlockType(id, type)
                          setShowGripMenu(null)
                        }}
                        placement={gripMenuPlacement}
                        onClose={() => setShowGripMenu(null)}
                        onOpenLinkDialog={(id) => {
                          changeBlockType(id, 'paragraph')
                          setShowGripMenu(null)
                          openLinkDialogForSelection(id)
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Block content */}
            <div className="relative">
              <BlockRenderer
                block={block}
                blocks={blocks}
                readOnly={readOnly}
                placeholder={getBlockPlaceholder(block.type)}
                blockRef={(el) => {
                  blockRefs.current[block.id] = el
                }}
                prevContentRef={prevContentRef}
                tableCellRefs={tableCellRefs}
                tableCellContentRef={tableCellContentRef}
                uploadingBlocks={uploadingBlocks}
                hoveredImageId={hoveredImageId}
                setHoveredImageId={setHoveredImageId}
                setActiveBlockId={setActiveBlockId}
                isSelectingRef={isSelectingRef}
                saveSelectionForBlock={saveSelection}
                updateBlock={updateBlock}
                updateTableCell={updateTableCell}
                addTableRow={addTableRow}
                addTableColumn={addTableColumn}
                removeTableRow={removeTableRow}
                removeTableColumn={removeTableColumn}
                handleFileUpload={handleFileUpload}
                handleCommandDetection={handleCommandDetection}
                handleAnchorClick={handleAnchorClick}
                handleKeyDown={handleKeyDown}
                handlePaste={handlePaste}
              />

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
        <TextToolbar
          position={toolbarPos}
          formatState={formatState}
          onFormat={handleFormat}
          onClose={() => setShowTextToolbar(false)}
        />
      )}

      {/* Floating link toolbar (hover on anchors) */}
      {!readOnly && showLinkToolbar && linkToolbarBlockId && (
        <LinkToolbar
          position={linkToolbarPos}
          onEdit={openLinkEditDialog}
          onRemove={unlinkAnchor}
          forwardRef={linkToolbarRef}
        />
      )}

      {/* Link Dialog */}
      {!readOnly && showLinkDialog && (
        <LinkDialog
          text={linkDialogText}
          url={linkDialogUrl}
          onTextChange={setLinkDialogText}
          onUrlChange={setLinkDialogUrl}
          onSave={applyLinkFromDialog}
          onCancel={closeLinkDialog}
        />
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

export default DocumentEditorModular

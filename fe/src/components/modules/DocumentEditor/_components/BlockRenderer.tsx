import type { ReactElement } from 'react'

import type { DocumentBlock } from '@/types/documents'

import {
  ParagraphBlock,
  HeadingBlock,
  QuoteBlock,
  CodeBlock,
  ListBlock,
  ImageBlock,
  FileBlock,
  TableBlock,
} from '../_sections'
import type { TableCellRefs } from '../_types'
import { normalizeAnchors } from '../_utils'

interface BlockRendererProps {
  block: DocumentBlock
  blocks: DocumentBlock[]
  readOnly: boolean
  placeholder: string
  blockRef: (el: HTMLElement | null) => void
  prevContentRef: React.MutableRefObject<{ [key: string]: string }>
  tableCellRefs: React.MutableRefObject<TableCellRefs>
  tableCellContentRef: React.MutableRefObject<Record<string, string>>
  uploadingBlocks: Set<string>
  hoveredImageId: string | null
  setHoveredImageId: (id: string | null) => void
  setActiveBlockId: (id: string) => void
  isSelectingRef: React.MutableRefObject<boolean>
  saveSelectionForBlock: (blockId: string, context?: { element?: HTMLElement; offsets?: { start: number; end: number; backward: boolean } | null }) => void
  updateBlock: (id: string, updates: Partial<DocumentBlock>) => void
  updateTableCell: (blockId: string, cellId: string, value: string) => void
  addTableRow: (blockId: string) => void
  addTableColumn: (blockId: string) => void
  removeTableRow: (blockId: string) => void
  removeTableColumn: (blockId: string) => void
  handleFileUpload: (blockId: string, file: File, blockType?: DocumentBlock['type'], cleanupOnFailure?: boolean) => Promise<void>
  handleCommandDetection: (blockId: string, html: string) => void
  handleAnchorClick: (e: React.MouseEvent, blockId: string) => void
  handleKeyDown: (e: React.KeyboardEvent, blockId: string) => void
  handlePaste: (e: React.ClipboardEvent, blockId: string) => void
}

export const BlockRenderer = ({
  block,
  blocks,
  readOnly,
  placeholder,
  blockRef,
  prevContentRef,
  tableCellRefs,
  tableCellContentRef,
  uploadingBlocks,
  hoveredImageId,
  setHoveredImageId,
  setActiveBlockId,
  isSelectingRef,
  saveSelectionForBlock,
  updateBlock,
  updateTableCell,
  addTableRow,
  addTableColumn,
  removeTableRow,
  removeTableColumn,
  handleFileUpload,
  handleCommandDetection,
  handleAnchorClick,
  handleKeyDown,
  handlePaste,
}: BlockRendererProps): ReactElement => {
  const commonProps = {
    block,
    readOnly,
    placeholder,
    blockRef: blockRef as (el: HTMLDivElement | null) => void,
    prevContentRef,
    onFocus: (): void => { 
      setActiveBlockId(block.id)
      saveSelectionForBlock(block.id)
    },
    onMouseDown: (): void => { 
      setActiveBlockId(block.id)
      isSelectingRef.current = true
    },
    onKeyUp: () => saveSelectionForBlock(block.id),
    onClick: (e: React.MouseEvent): void => { 
      handleAnchorClick(e, block.id)
      saveSelectionForBlock(block.id)
    },
    onKeyDown: (e: React.KeyboardEvent): void => { 
      handleKeyDown(e, block.id)
    },
    onInput: (e: React.FormEvent<HTMLDivElement>): void => {
      const html = (e.currentTarget as HTMLDivElement).innerHTML
      // eslint-disable-next-line no-console
      console.log('[onInput] Event fired for block:', block.id, 'HTML length:', html.length, 'Contains <br>:', html.includes('<br>'))
      prevContentRef.current[block.id] = html
      normalizeAnchors(e.currentTarget as HTMLDivElement)
      // eslint-disable-next-line no-console
      console.log('[onInput] Calling updateBlock for block:', block.id)
      updateBlock(block.id, { content: (e.currentTarget as HTMLDivElement).innerHTML })
      handleCommandDetection(block.id, html)
      // eslint-disable-next-line no-console
      console.log('[onInput] updateBlock called, new content:', (e.currentTarget as HTMLDivElement).innerHTML.substring(0, 100))
    },
    onPaste: (e: React.ClipboardEvent): void => handlePaste(e, block.id),
  }

  switch (block.type) {
    case 'heading1':
    case 'heading2':
    case 'heading3':
      return <HeadingBlock {...commonProps} />

    case 'quote':
      return <QuoteBlock {...commonProps} />

    case 'code':
      return (
        <CodeBlock
          block={block}
          readOnly={readOnly}
          placeholder={placeholder}
          updateBlock={updateBlock}
          onKeyDown={(e) => handleKeyDown(e, block.id)}
        />
      )

    case 'bulleted-list':
    case 'numbered-list':
      return <ListBlock {...commonProps} blocks={blocks} />

    case 'image':
      return (
        <ImageBlock
          block={block}
          readOnly={readOnly}
          uploadingBlocks={uploadingBlocks}
          hoveredImageId={hoveredImageId}
          setHoveredImageId={setHoveredImageId}
          updateBlock={updateBlock}
          handleFileUpload={handleFileUpload}
        />
      )

    case 'file':
      return (
        <FileBlock
          block={block}
          readOnly={readOnly}
          uploadingBlocks={uploadingBlocks}
          updateBlock={updateBlock}
          handleFileUpload={handleFileUpload}
        />
      )

    case 'table':
      return (
        <TableBlock
          block={block}
          readOnly={readOnly}
          tableCellRefs={tableCellRefs}
          tableCellContentRef={tableCellContentRef}
          setActiveBlockId={setActiveBlockId}
          isSelectingRef={isSelectingRef}
          saveSelectionForBlock={saveSelectionForBlock}
          updateTableCell={updateTableCell}
          addTableRow={addTableRow}
          addTableColumn={addTableColumn}
          removeTableRow={removeTableRow}
          removeTableColumn={removeTableColumn}
        />
      )

    default:
      return <ParagraphBlock {...commonProps} />
  }
}

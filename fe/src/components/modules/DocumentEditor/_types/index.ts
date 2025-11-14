// Re-export from documents types
export type {
  DocumentBlock,
  DocumentTableData,
  DocumentTableRow,
  DocumentTableCell,
} from '@/types/documents'

import type { DocumentBlock } from '@/types/documents'

export interface DocumentEditorProps {
  initialBlocks?: DocumentBlock[]
  onSave?: (blocks: DocumentBlock[]) => void
  readOnly?: boolean
  title?: string
  onTitleChange?: (title: string) => void
}

export interface SelectionOffsets {
  start: number
  end: number
  backward: boolean
}

export interface SavedSelection {
  blockId: string
  start: number
  end: number
  backward: boolean
}

export interface ToolbarPosition {
  x: number
  y: number
}

export interface FormatState {
  bold: boolean
  italic: boolean
  underline: boolean
}

export type MenuPlacement = 'bottom' | 'top'

export interface BlockRefs {
  [key: string]: HTMLElement | null
}

export interface TableCellRefs {
  [key: string]: HTMLDivElement | null
}

export type DocumentItemType = 'folder' | 'file'

export type DocumentStatus = 'active' | 'archived' | 'shared' | 'private'

export interface DocumentTableCell {
  id: string
  content: string
}

export interface DocumentTableRow {
  id: string
  cells: DocumentTableCell[]
}

export interface DocumentTableData {
  rows: DocumentTableRow[]
}

export interface DocumentBlock {
  id: string
  type:
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulleted-list'
  | 'numbered-list'
  | 'quote'
  | 'code'
  | 'image'
  | 'file'
  | 'table'
  content: string
  alignment?: 'left' | 'center' | 'right'
  url?: string // For image src or file download URL
  fileName?: string // For file blocks
  fileSize?: string // For file blocks
  table?: DocumentTableData // For table blocks
}

export interface DocumentOwner {
  id: string
  name: string
  role: 'admin' | 'manager' | 'employee' | 'secretary'
  avatar?: string
}

export interface DocumentUserRef {
  id: string
  name: string
  avatar?: string | null
}

export interface EditHistoryEvent {
  editor: DocumentUserRef
  at: string // ISO
}

export interface DocumentItem {
  id: string
  name: string // File name (e.g., "work-arrangement.docx")
  title?: string // Document title (e.g., "Work Arrangement Request Form")
  type: DocumentItemType
  ownedBy: DocumentOwner
  category?: string
  status: DocumentStatus
  dateCreated: string
  lastModified?: string | null
  lastModifiedBy?: DocumentUserRef | null
  size?: string // For files only
  itemCount?: number // For folders only
  parentId?: string // For nested items
  path: string[] // Array of folder names representing the path
  shared?: boolean
  shareUrl?: string
  content?: DocumentBlock[] // Document content as structured blocks
  userPermissions?: import('./document-permissions').DocumentPermission[] // Individual user permissions
  divisionPermissions?: import('./document-permissions').DivisionPermission[] // Division-level permissions
}

export interface DocumentBreadcrumb {
  id: string
  name: string
  path: string[]
}

export interface DocumentsState {
  currentPath: string[]
  currentFolderId: string | null
  items: DocumentItem[]
  breadcrumbs: DocumentBreadcrumb[]
}

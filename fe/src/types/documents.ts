export type DocumentItemType = 'folder' | 'file'

export type DocumentStatus = 'active' | 'archived' | 'shared' | 'private'

export interface DocumentOwner {
  id: string
  name: string
  role: 'admin' | 'manager' | 'employee' | 'secretary'
  avatar?: string
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
  lastModified: string
  size?: string // For files only
  itemCount?: number // For folders only
  parentId?: string // For nested items
  path: string[] // Array of folder names representing the path
  shared?: boolean
  shareUrl?: string
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

import axios from 'axios'

import { useAuthStore } from '@/stores/authStore'

import type { DocumentItem, DocumentBlock } from '../types/document-type'

const API_BASE_URL = 'https://api.systemq.qtn.ai'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
})

// Add authentication interceptor
api.interceptors.request.use((config) => {
  const session = useAuthStore.getState().getCurrentSession()
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`
  }
  return config
})

// Update the headers to match the API schema
interface ApiDocumentItem {
  name: string,
  type: string,
  category: string | null,
  status: string,
  parent_id: string | null,
  shared: boolean,
  share_url: string | null,
  id: string,
  owned_by: {
    id: string,
    name: string,
    role: string,
    avatar: string | null
  },
  date_created: string,
  last_modified: string,
  size: string | null,
  item_count: number,
  path: string[],
  content: DocumentBlock[]
}

// Transform API response to match our internal type
function transformApiDocument(apiDoc: ApiDocumentItem): DocumentItem {
  return {
    id: apiDoc.id,
    name: apiDoc.name,
    type: apiDoc.type as 'folder' | 'file',
    category: apiDoc.category ?? undefined,
    status: apiDoc.status as 'active' | 'archived' | 'shared' | 'private',
    parentId: apiDoc.parent_id ?? undefined,
    shared: apiDoc.shared,
    shareUrl: apiDoc.share_url ?? undefined,
    ownedBy: {
      id: apiDoc.owned_by.id,
      name: apiDoc.owned_by.name,
      role: apiDoc.owned_by.role as 'admin' | 'manager' | 'employee' | 'secretary',
      avatar: apiDoc.owned_by.avatar ?? undefined
    },
    dateCreated: apiDoc.date_created,
    lastModified: apiDoc.last_modified,
    size: apiDoc.size ?? undefined,
    itemCount: apiDoc.item_count,
    path: apiDoc.path,
    content: apiDoc.content || []
  }
}

// Fetch documents by parent ID
export async function getDocumentsByParentId(parentId: string | null | undefined): Promise<DocumentItem[]> {
  try {
    const endpoint = parentId 
      ? `/documents/?parent_id=${encodeURIComponent(parentId)}` 
      : '/documents/'
    
    const response = await api.get<ApiDocumentItem[]>(endpoint)
    return response.data.map(transformApiDocument)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching documents:', error)
    return []
  }
}

// Get actual item count by making a specific API call
export async function getActualItemCount(folderId: string): Promise<number> {
  try {
    const response = await api.get<ApiDocumentItem[]>(`/documents/?parent_id=${encodeURIComponent(folderId)}`)
    return response.data.length
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching item count:', error)
    return 0
  }
}

// Get document by ID
export async function getDocumentById(id: string, _parentId: string | null): Promise<DocumentItem | null> {
  try {
    const response = await api.get<ApiDocumentItem>(`/documents/${encodeURIComponent(id)}`)
    return transformApiDocument(response.data)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching document by ID:', error)
    return null
  }
}

// Updated async version of getFolderPathIds
export async function getFolderPathIds(folderId: string | null): Promise<string[]> {
  if (!folderId) return []
  const folder = await getDocumentById(folderId, null)
  if (!folder) return []

  const pathIds: string[] = []
  let currentFolder: DocumentItem | null = folder
  while (currentFolder?.parentId) {
    pathIds.unshift(currentFolder.parentId)
    currentFolder = await getDocumentById(currentFolder.parentId, null)
  }
  pathIds.push(folderId)
  return pathIds
}

// Updated async version of buildBreadcrumbs
export async function buildBreadcrumbs(currentFolderId: string | null): Promise<{ id: string; name: string; path: string[] }[]> {
  const breadcrumbs: { id: string; name: string; path: string[] }[] = [
    { id: 'root', name: 'Documents', path: [] }
  ]
  if (!currentFolderId) return breadcrumbs

  const currentFolder = await getDocumentById(currentFolderId, null)
  if (!currentFolder) return breadcrumbs

  const pathIds: string[] = []
  let folder: DocumentItem | null = currentFolder
  while (folder?.parentId) {
    pathIds.unshift(folder.parentId)
    const parentFolder = await getDocumentById(folder.parentId, null)
    folder = parentFolder
  }
  pathIds.push(currentFolderId)

  let currentPath: string[] = []
  for (const id of pathIds) {
    const folderDoc = await getDocumentById(id, null)
    if (folderDoc) {
      currentPath = [...currentPath, folderDoc.name]
      breadcrumbs.push({ id, name: folderDoc.name, path: currentPath.slice(0, -1) })
    }
  }

  return breadcrumbs
}

export async function getDocumentTypes(searchQuery: string = ''): Promise<string[]> {
  // Get all documents to extract existing types
  const allDocuments = await getDocumentsByParentId(null);
  const existingTypes = Array.from(new Set(
    allDocuments
      .filter(doc => doc.type === 'file')
      .map(doc => doc.category)
      .filter(Boolean)
  )) as string[]

  const predefinedTypes = [
    'Standard Operating Procedure',
    'Policy Document',
    'Charter',
    'Meeting Notes',
    'Template',
    'Report',
    'Manual',
    'Guidelines',
    'Contract',
    'Proposal',
    'Specification',
    'Training Material'
  ]

  const allTypes = Array.from(new Set([...predefinedTypes, ...existingTypes]))
  if (!searchQuery) return allTypes.sort()
  const filtered = allTypes.filter(type => type.toLowerCase().includes(searchQuery.toLowerCase()))
  return filtered.length === 0 ? [searchQuery] : filtered.sort()
}

export async function getDocumentCategories(searchQuery: string = ''): Promise<string[]> {
  // Get all documents to extract existing categories
  const allDocuments = await getDocumentsByParentId(null);
  const existing = Array.from(new Set(
    allDocuments
      .filter(doc => doc.category)
      .map(doc => doc.category)
      .filter(Boolean)
  )) as string[]

  const predefined = [
    'Company Policies',
    'Attendance',
    'Charter',
    'Meeting Notes',
    'Templates',
    'HR Policies',
    'Financial',
    'Operations',
    'Legal',
    'Marketing',
    'Sales',
    'Technical',
    'Training',
    'Compliance',
    'Quality Assurance',
    'Project Management'
  ]

  const all = Array.from(new Set([...predefined, ...existing]))
  if (!searchQuery) return all.sort()
  const filtered = all.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  return filtered.length === 0 ? [searchQuery] : filtered.sort()
}

// Create new document or folder
export async function createDocument(name: string, type: 'file' | 'folder', parentId: string | null, authToken: string): Promise<DocumentItem | null> {
  try {
    const payload = {
      name,
      title: null,
      type,
      category: null,
      status: 'active',
      parent_id: parentId,
      shared: false,
      share_url: null,
      id: null,
      content: []
    }

    const response = await api.post<ApiDocumentItem>('/documents/', payload, {
      headers: {
        'Authorization': authToken
      }
    })

    return transformApiDocument(response.data)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating document:', error)
    return null
  }
}

// Delete document or folder
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    await api.delete(`/documents/${encodeURIComponent(documentId)}`)
    return true
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error deleting document:', error)
    return false
  }
}

// Rename document or folder
export async function renameDocument(documentId: string, newName: string): Promise<DocumentItem | null> {
  try {
    const response = await api.patch<ApiDocumentItem>(`/documents/${encodeURIComponent(documentId)}`, {
      name: newName
    })
    return transformApiDocument(response.data)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error renaming document:', error)
    return null
  }
}

// Update document content payload interface
export interface UpdateDocumentContentPayload {
  category: string
  content: DocumentBlock[]
}

// Update document content (for files only)
export async function updateDocumentContent(
  documentId: string,
  payload: UpdateDocumentContentPayload
): Promise<DocumentItem | null> {
  try {
    const response = await api.patch<ApiDocumentItem>(`/documents/${encodeURIComponent(documentId)}`, payload)
    return transformApiDocument(response.data)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating document content:', error)
    return null
  }
}


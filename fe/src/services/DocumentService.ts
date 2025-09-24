import axios from 'axios'
import type { DocumentItem } from '../types/document-type'

const API_BASE_URL = 'https://api.systemq.qtn.ai'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
})

// Update the headers to match the API schema
interface ApiDocumentItem {
  name: string,
  title: string,
  type: string,
  category: string,
  status: string,
  parent_id: string,
  shared: boolean,
  share_url: string,
  id: string,
  owned_by: {
    id: string,
    name: string,
    role: string,
    avatar: string
  },
  date_created: string,
  last_modified: string,
  size: string,
  item_count: number,
  path: string[],
  content: string
}

// Transform API response to match our internal type
function transformApiDocument(apiDoc: ApiDocumentItem): DocumentItem {
  return {
    id: apiDoc.id,
    name: apiDoc.name,
    title: apiDoc.title,
    type: apiDoc.type as 'folder' | 'file',
    category: apiDoc.category,
    status: apiDoc.status as 'active' | 'archived' | 'shared' | 'private',
    parentId: apiDoc.parent_id || undefined,
    shared: apiDoc.shared,
    shareUrl: apiDoc.share_url,
    ownedBy: {
      id: apiDoc.owned_by.id,
      name: apiDoc.owned_by.name,
      role: apiDoc.owned_by.role as 'admin' | 'manager' | 'employee' | 'secretary',
      avatar: apiDoc.owned_by.avatar || undefined
    },
    dateCreated: apiDoc.date_created,
    lastModified: apiDoc.last_modified,
    size: apiDoc.size || undefined,
    itemCount: apiDoc.item_count,
    path: apiDoc.path
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
    console.error('Error fetching item count:', error)
    return 0
  }
}

// Get document by ID
export async function getDocumentById(id: string): Promise<DocumentItem | undefined> {
  try {
    // We'll make a request to get all documents and find the one by ID
    // In a real implementation, we would have an endpoint like /documents/{id}
    // For now, we'll search through the root documents assuming IDs are globally unique
    const rootDocuments = await getDocumentsByParentId(null);
    
    // First, check root documents
    let foundDoc = rootDocuments.find(doc => doc.id === id);
    if (foundDoc) {
      return foundDoc;
    }
    
    // If not found in root, we'd need to recursively search through folders
    // For this implementation, we'll keep it simple for now
    // In a real application, an endpoint like /documents/{id} should exist
    
    return undefined;
  } catch (error) {
    console.error('Error fetching document by ID:', error);
    return undefined;
  }
}

// Updated async version of getFolderPathIds
export async function getFolderPathIds(folderId: string): Promise<string[]> {
  const folder = await getDocumentById(folderId)
  if (!folder) return []

  const pathIds: string[] = []
  let currentFolder: DocumentItem | null = folder
  while (currentFolder?.parentId) {
    pathIds.unshift(currentFolder.parentId)
    currentFolder = await getDocumentById(currentFolder.parentId) ?? null
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

  const currentFolder = await getDocumentById(currentFolderId)
  if (!currentFolder) return breadcrumbs

  const pathIds: string[] = []
  let folder: DocumentItem | null = currentFolder
  while (folder?.parentId) {
    pathIds.unshift(folder.parentId)
    const parentFolder = await getDocumentById(folder.parentId)
    folder = parentFolder ?? null
  }
  pathIds.push(currentFolderId)

  let currentPath: string[] = []
  for (const id of pathIds) {
    const folderDoc = await getDocumentById(id)
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


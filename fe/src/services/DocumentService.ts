import docsData from '../data/mockDocuments.json'
import type { DocumentItem } from '../types/document-type'

const mockDocuments = docsData as DocumentItem[]

export function getDocumentsByParentId(parentId: string | null | undefined): DocumentItem[] {
  return mockDocuments.filter(doc => doc.parentId === parentId || (!doc.parentId && !parentId))
}

export function getActualItemCount(folderId: string): number {
  return mockDocuments.filter(doc => doc.parentId === folderId).length
}

export function getDocumentById(id: string): DocumentItem | undefined {
  return mockDocuments.find(doc => doc.id === id)
}

export function getFolderPathIds(folderId: string): string[] {
  const folder = getDocumentById(folderId)
  if (!folder) return []

  const pathIds: string[] = []
  let currentFolder: DocumentItem | null = folder
  while (currentFolder?.parentId) {
    pathIds.unshift(currentFolder.parentId)
    currentFolder = getDocumentById(currentFolder.parentId) ?? null
  }
  pathIds.push(folderId)
  return pathIds
}

export function buildBreadcrumbs(currentFolderId: string | null): { id: string; name: string; path: string[] }[] {
  const breadcrumbs: { id: string; name: string; path: string[] }[] = [
    { id: 'root', name: 'Documents', path: [] }
  ]
  if (!currentFolderId) return breadcrumbs

  const currentFolder = getDocumentById(currentFolderId)
  if (!currentFolder) return breadcrumbs

  const pathIds: string[] = []
  let folder: DocumentItem | null = currentFolder
  while (folder?.parentId) {
    pathIds.unshift(folder.parentId)
    const parentFolder = getDocumentById(folder.parentId)
    folder = parentFolder ?? null
  }
  pathIds.push(currentFolderId)

  let currentPath: string[] = []
  pathIds.forEach(id => {
    const folderDoc = getDocumentById(id)
    if (folderDoc) {
      currentPath = [...currentPath, folderDoc.name]
      breadcrumbs.push({ id, name: folderDoc.name, path: currentPath.slice(0, -1) })
    }
  })

  return breadcrumbs
}

export async function getDocumentTypes(searchQuery: string = ''): Promise<string[]> {
  await new Promise(resolve => setTimeout(resolve, 200))
  const existingTypes = Array.from(new Set(
    mockDocuments
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
  await new Promise(resolve => setTimeout(resolve, 200))
  const existing = Array.from(new Set(
    mockDocuments
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


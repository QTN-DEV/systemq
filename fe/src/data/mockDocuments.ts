import type { DocumentItem, DocumentOwner } from '../types/documents'

// Mock owners based on the image data
export const mockOwners: DocumentOwner[] = [
  {
    id: 'quantum-admin',
    name: 'Quantum Admin',
    role: 'admin',
    avatar: 'QA'
  },
  {
    id: 'grace-edenia',
    name: 'Grace Edenia',
    role: 'secretary',
    avatar: 'GE'
  },
  {
    id: 'grace-maron',
    name: 'Grace Maron',
    role: 'employee',
    avatar: 'GM'
  }
]

// Mock documents data that matches the image structure
export const mockDocuments: DocumentItem[] = [
  // Root level items
  {
    id: 'quantum-sop',
    name: "Quantum's Standard Operating Procedures",
    type: 'folder',
    ownedBy: mockOwners[0], // Quantum Admin
    category: 'Company Policies',
    status: 'active',
    dateCreated: '01 September 2025',
    lastModified: '01 September 2025',
    itemCount: 15,
    parentId: undefined,
    path: [],
    shared: false
  },
  {
    id: 'work-arrangement',
    name: 'work-arrangement.docx',
    title: 'Work Arrangement Request Form',
    type: 'file',
    ownedBy: mockOwners[1], // Grace Edenia
    category: 'Attendance',
    status: 'active',
    dateCreated: '08 August 2025',
    lastModified: '29 August 2025',
    size: '2.4 MB',
    parentId: undefined,
    path: [],
    shared: false
  },
  {
    id: 'charter-kenamaan',
    name: 'charter-kenamaan.pdf',
    title: 'Charter Kenamaan - P/KEN/2504/006',
    type: 'file',
    ownedBy: mockOwners[2], // Grace Maron
    category: 'Charter',
    status: 'shared',
    dateCreated: '01 August 2025',
    lastModified: '07 August 2025',
    size: '1.8 MB',
    parentId: undefined,
    path: [],
    shared: true,
    shareUrl: '/documents/file/charter-kenamaan'
  },

  // Items inside "Quantum's Standard Operating Procedures" folder
  {
    id: 'hr-policies',
    name: 'HR Policies',
    type: 'folder',
    ownedBy: mockOwners[0],
    category: 'Company Policies',
    status: 'active',
    dateCreated: '01 September 2025',
    lastModified: '15 September 2025',
    itemCount: 8,
    parentId: 'quantum-sop',
    path: ["Quantum's Standard Operating Procedures"],
    shared: false
  },
  {
    id: 'financial-procedures',
    name: 'Financial Procedures',
    type: 'folder',
    ownedBy: mockOwners[0],
    category: 'Company Policies',
    status: 'active',
    dateCreated: '01 September 2025',
    lastModified: '10 September 2025',
    itemCount: 5,
    parentId: 'quantum-sop',
    path: ["Quantum's Standard Operating Procedures"],
    shared: false
  },
  {
    id: 'code-of-conduct',
    name: 'Code of Conduct.pdf',
    type: 'file',
    ownedBy: mockOwners[0],
    category: 'Company Policies',
    status: 'active',
    dateCreated: '01 September 2025',
    lastModified: '01 September 2025',
    size: '850 KB',
    parentId: 'quantum-sop',
    path: ["Quantum's Standard Operating Procedures"],
    shared: false
  },
  {
    id: 'employee-handbook',
    name: 'Employee Handbook.pdf',
    type: 'file',
    ownedBy: mockOwners[0],
    category: 'Company Policies',
    status: 'active',
    dateCreated: '01 September 2025',
    lastModified: '05 September 2025',
    size: '2.1 MB',
    parentId: 'quantum-sop',
    path: ["Quantum's Standard Operating Procedures"],
    shared: false
  },

  // Items inside HR Policies folder
  {
    id: 'leave-policy',
    name: 'Leave Policy.pdf',
    type: 'file',
    ownedBy: mockOwners[0],
    category: 'Company Policies',
    status: 'active',
    dateCreated: '02 September 2025',
    lastModified: '15 September 2025',
    size: '1.2 MB',
    parentId: 'hr-policies',
    path: ["Quantum's Standard Operating Procedures", 'HR Policies'],
    shared: false
  },
  {
    id: 'performance-review',
    name: 'Performance Review Guidelines.docx',
    type: 'file',
    ownedBy: mockOwners[0],
    category: 'Company Policies',
    status: 'active',
    dateCreated: '03 September 2025',
    lastModified: '12 September 2025',
    size: '980 KB',
    parentId: 'hr-policies',
    path: ["Quantum's Standard Operating Procedures", 'HR Policies'],
    shared: false
  },
  {
    id: 'recruitment-process',
    name: 'Recruitment Process',
    type: 'folder',
    ownedBy: mockOwners[0],
    category: 'Company Policies',
    status: 'active',
    dateCreated: '03 September 2025',
    lastModified: '14 September 2025',
    itemCount: 3,
    parentId: 'hr-policies',
    path: ["Quantum's Standard Operating Procedures", 'HR Policies'],
    shared: false
  },

  // Items inside Financial Procedures folder
  {
    id: 'expense-policy',
    name: 'Expense Reimbursement Policy.pdf',
    type: 'file',
    ownedBy: mockOwners[0],
    category: 'Company Policies',
    status: 'active',
    dateCreated: '02 September 2025',
    lastModified: '10 September 2025',
    size: '1.5 MB',
    parentId: 'financial-procedures',
    path: ["Quantum's Standard Operating Procedures", 'Financial Procedures'],
    shared: false
  },
  {
    id: 'budget-approval',
    name: 'Budget Approval Workflow.pdf',
    type: 'file',
    ownedBy: mockOwners[0],
    category: 'Company Policies',
    status: 'active',
    dateCreated: '02 September 2025',
    lastModified: '08 September 2025',
    size: '890 KB',
    parentId: 'financial-procedures',
    path: ["Quantum's Standard Operating Procedures", 'Financial Procedures'],
    shared: false
  },

  // Additional sample documents
  {
    id: 'project-templates',
    name: 'Project Templates',
    type: 'folder',
    ownedBy: mockOwners[1],
    category: 'Templates',
    status: 'active',
    dateCreated: '15 August 2025',
    lastModified: '25 August 2025',
    itemCount: 12,
    parentId: undefined,
    path: [],
    shared: true,
    shareUrl: '/documents/folder/project-templates'
  },
  {
    id: 'meeting-notes',
    name: 'meeting-notes-q3-2025.docx',
    title: 'Meeting Notes - Q3 2025',
    type: 'file',
    ownedBy: mockOwners[1],
    category: 'Meeting Notes',
    status: 'active',
    dateCreated: '20 August 2025',
    lastModified: '28 August 2025',
    size: '3.2 MB',
    parentId: undefined,
    path: [],
    shared: false
  }
]

// Helper function to get items by parent ID
export function getDocumentsByParentId(parentId: string | null | undefined): DocumentItem[] {
  return mockDocuments.filter(doc => doc.parentId === parentId || (!doc.parentId && !parentId))
}

// Helper function to calculate actual item count for a folder
export function getActualItemCount(folderId: string): number {
  return mockDocuments.filter(doc => doc.parentId === folderId).length
}

// Helper function to get document by ID
export function getDocumentById(id: string): DocumentItem | undefined {
  return mockDocuments.find(doc => doc.id === id)
}

// Helper function to get folder path by IDs (for URL navigation)
export function getFolderPathIds(folderId: string): string[] {
  const folder = getDocumentById(folderId)
  if (!folder) return []
  
  const pathIds: string[] = []
  let currentFolder: DocumentItem | null = folder
  
  // Build path from current folder to root
  while (currentFolder?.parentId) {
    pathIds.unshift(currentFolder.parentId)
    currentFolder = getDocumentById(currentFolder.parentId) ?? null
  }
  
  // Add current folder
  pathIds.push(folderId)
  
  return pathIds
}

// Helper function to build breadcrumbs
export function buildBreadcrumbs(currentFolderId: string | null): { id: string; name: string; path: string[] }[] {
  const breadcrumbs: { id: string; name: string; path: string[] }[] = [
    { id: 'root', name: 'Documents', path: [] }
  ]
  
  if (!currentFolderId) return breadcrumbs
  
  const currentFolder = getDocumentById(currentFolderId)
  if (!currentFolder) return breadcrumbs
  
  // Build path from root to current folder
  const pathIds: string[] = []
  let folder: DocumentItem | null = currentFolder
  
  while (folder?.parentId) {
    pathIds.unshift(folder.parentId)
    const parentFolder = getDocumentById(folder.parentId)
    folder = parentFolder ?? null
  }
  
  // Add current folder
  pathIds.push(currentFolderId)
  
  // Build breadcrumbs
  let currentPath: string[] = []
  pathIds.forEach(id => {
    const folderDoc = getDocumentById(id)
    if (folderDoc) {
      currentPath = [...currentPath, folderDoc.name]
      breadcrumbs.push({
        id,
        name: folderDoc.name,
        path: currentPath.slice(0, -1)
      })
    }
  })
  
  return breadcrumbs
}

// Mock API functions for document types and categories
export async function getDocumentTypes(searchQuery: string = ''): Promise<string[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200))
  
  // Get distinct document types from existing documents
  const existingTypes = Array.from(new Set(
    mockDocuments
      .filter(doc => doc.type === 'file')
      .map(doc => doc.category)
      .filter(Boolean)
  )) as string[]
  
  // Add some predefined types
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
  
  if (!searchQuery) {
    return allTypes.sort()
  }
  
  // Filter based on search query
  const filtered = allTypes.filter(type => 
    type.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // If no matches found, suggest the exact search query as a new option
  if (filtered.length === 0) {
    return [searchQuery]
  }
  
  return filtered.sort()
}

export async function getDocumentCategories(searchQuery: string = ''): Promise<string[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200))
  
  // Get distinct categories from existing documents
  const existingCategories = Array.from(new Set(
    mockDocuments
      .filter(doc => doc.category)
      .map(doc => doc.category)
      .filter(Boolean)
  )) as string[]
  
  // Add some predefined categories
  const predefinedCategories = [
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
  
  const allCategories = Array.from(new Set([...predefinedCategories, ...existingCategories]))
  
  if (!searchQuery) {
    return allCategories.sort()
  }
  
  // Filter based on search query
  const filtered = allCategories.filter(category => 
    category.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // If no matches found, suggest the exact search query as a new option
  if (filtered.length === 0) {
    return [searchQuery]
  }
  
  return filtered.sort()
}

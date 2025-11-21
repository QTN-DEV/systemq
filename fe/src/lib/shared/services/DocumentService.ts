import { useAuthStore } from "@/stores/authStore";
import { config } from "@/lib/config";
import apiClient from "@/lib/shared/api/client";

import type {
  DocumentPermissions,
  AddUserPermissionRequest,
  AddDivisionPermissionRequest,
  SearchUserResult,
} from "@/types/document-permissions";
import type { DocumentItem, DocumentBlock } from "@/types/document-type";
import type { EditHistoryEvent } from "@/types/documents";

if (config.isDev) {
  console.log("Document API base:", config.apiBaseUrl);
}

// Helper to ensure auth token is set before API calls
const ensureAuth = () => {
  const session = useAuthStore.getState().getCurrentSession();
  if (session?.token) {
    apiClient.setAuthHeader(session.token);
  }
};

// Update the headers to match the API schema
interface ApiDocumentItem {
  name: string;
  type: string;
  category: string | null;
  status: string;
  parent_id: string | null;
  shared: boolean;
  share_url: string | null;
  id: string;
  owned_by: {
    id: string;
    name: string;
    role: string;
    avatar: string | null;
  };
  date_created: string;
  last_modified: string;
  size: string | null;
  item_count: number;
  path: string[];
  content: DocumentBlock[];
  last_modified_by?: {
    id: string;
    name: string;
  } | null;
  user_permissions?: {
    user_id: string;
    user_name: string;
    user_email: string;
    permission: string;
  }[];
  division_permissions?: {
    division: string;
    permission: string;
  }[];
}

// Transform API response to match our internal type
function transformApiDocument(apiDoc: ApiDocumentItem): DocumentItem {
  return {
    id: apiDoc.id,
    name: apiDoc.name,
    type: apiDoc.type as "folder" | "file",
    category: apiDoc.category ?? undefined,
    status: apiDoc.status as "active" | "archived" | "shared" | "private",
    parentId: apiDoc.parent_id ?? undefined,
    shared: apiDoc.shared,
    shareUrl: apiDoc.share_url ?? undefined,
    ownedBy: {
      id: apiDoc.owned_by.id,
      name: apiDoc.owned_by.name,
      role: apiDoc.owned_by.role as
        | "admin"
        | "manager"
        | "employee"
        | "secretary",
      avatar: apiDoc.owned_by.avatar ?? undefined,
    },
    dateCreated: apiDoc.date_created,
    lastModified: apiDoc.last_modified,
    lastModifiedBy: apiDoc.last_modified_by
      ? { id: apiDoc.last_modified_by.id, name: apiDoc.last_modified_by.name }
      : null,
    size: apiDoc.size ?? undefined,
    itemCount: apiDoc.item_count,
    path: apiDoc.path,
    content: apiDoc.content || [],
    userPermissions: apiDoc.user_permissions?.map((perm) => ({
      user_id: perm.user_id,
      user_name: perm.user_name,
      user_email: perm.user_email,
      permission: perm.permission as "viewer" | "editor",
    })),
    divisionPermissions: apiDoc.division_permissions?.map((perm) => ({
      division: perm.division,
      permission: perm.permission as "viewer" | "editor",
    })),
  };
}

/**
 * Search all accessible documents/folders for current user.
 * @param q query string (min 1 char; BE handle regex i)
 * @param types optional ['file','folder']
 * @param limit default 50
 * @param offset default 0
 */
export async function searchDocuments(
  q: string,
  types?: Array<'file' | 'folder'>,
  limit = 50,
  offset = 0
): Promise<DocumentItem[]> {
  try {
    ensureAuth();
    const params = new URLSearchParams()
    params.set('q', q)
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    types?.forEach(t => params.append('types', t))

    const endpoint = `/documents/search?${params.toString()}`
    
    const data = await apiClient.get<ApiDocumentItem[]>(endpoint)
    return data.map(transformApiDocument)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('searchDocuments error:', err)
    return []
  }
}

// Fetch documents by parent ID
export async function getDocumentsByParentId(
  parentId: string | null | undefined
): Promise<DocumentItem[]> {
  try {
    ensureAuth();
    const endpoint = parentId
      ? `/documents/?parent_id=${encodeURIComponent(parentId)}`
      : "/documents/";
    
    const data = await apiClient.get<ApiDocumentItem[]>(endpoint, {
      params: { _t: Date.now() },
    });
    return data.map(transformApiDocument);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching documents:", error);
    return [];
  }
}

// Get actual item count by making a specific API call
export async function getActualItemCount(folderId: string): Promise<number> {
  try {
    ensureAuth();
    const data = await apiClient.get<ApiDocumentItem[]>(
      `/documents/?parent_id=${encodeURIComponent(folderId)}`
    );
    return data.length;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching item count:", error);
    return 0;
  }
}

// Get document by ID
export async function getDocumentById(
  id: string,
  _parentId: string | null
): Promise<DocumentItem | null> {
  try {
    ensureAuth();
    const data = await apiClient.get<ApiDocumentItem>(
      `/documents/${encodeURIComponent(id)}`,
      {
        params: { _t: Date.now() },
      }
    );
    return transformApiDocument(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching document by ID:", error);
    return null;
  }
}

// Updated async version of getFolderPathIds
export async function getFolderPathIds(
  folderId: string | null
): Promise<string[]> {
  if (!folderId) return [];
  const folder = await getDocumentById(folderId, null);
  if (!folder) return [];

  const pathIds: string[] = [];
  let currentFolder: DocumentItem | null = folder;
  while (currentFolder?.parentId) {
    pathIds.unshift(currentFolder.parentId);
    currentFolder = await getDocumentById(currentFolder.parentId, null);
  }
  pathIds.push(folderId);
  return pathIds;
}

// Updated async version of buildBreadcrumbs
export async function buildBreadcrumbs(
  currentFolderId: string | null,
  isSharedView = false
): Promise<{ id: string; name: string; path: string[] }[]> {
  const breadcrumbs: { id: string; name: string; path: string[] }[] = [
    { id: "root", name: isSharedView ? "Shared with Me" : "Documents", path: [] },
  ];
  if (!currentFolderId) return breadcrumbs;

  const currentFolder = await getDocumentById(currentFolderId, null);
  if (!currentFolder) return breadcrumbs;

  const pathIds: string[] = [];
  let folder: DocumentItem | null = currentFolder;
  while (folder?.parentId) {
    pathIds.unshift(folder.parentId);
    const parentFolder = await getDocumentById(folder.parentId, null);
    folder = parentFolder;
  }
  pathIds.push(currentFolderId);

  let currentPath: string[] = [];
  for (const id of pathIds) {
    const folderDoc = await getDocumentById(id, null);
    if (folderDoc) {
      currentPath = [...currentPath, folderDoc.name];
      breadcrumbs.push({
        id,
        name: folderDoc.name,
        path: currentPath.slice(0, -1),
      });
    }
  }

  return breadcrumbs;
}

export async function getDocumentTypes(
  searchQuery: string = ""
): Promise<string[]> {
  // Get all documents to extract existing types
  const allDocuments = await getDocumentsByParentId(null);
  const existingTypes = Array.from(
    new Set(
      allDocuments
        .filter((doc) => doc.type === "file")
        .map((doc) => doc.category)
        .filter(Boolean)
    )
  ) as string[];

  const predefinedTypes = [
    "Standard Operating Procedure",
    "Policy Document",
    "Charter",
    "Meeting Notes",
    "Template",
    "Report",
    "Manual",
    "Guidelines",
    "Contract",
    "Proposal",
    "Specification",
    "Training Material",
  ];

  const allTypes = Array.from(new Set([...predefinedTypes, ...existingTypes]));
  if (!searchQuery) return allTypes.sort();
  const filtered = allTypes.filter((type) =>
    type.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return filtered.length === 0 ? [searchQuery] : filtered.sort();
}

export async function getDocumentCategories(
  searchQuery: string = ""
): Promise<string[]> {
  // Get all documents to extract existing categories
  const allDocuments = await getDocumentsByParentId(null);
  const existing = Array.from(
    new Set(
      allDocuments
        .filter((doc) => doc.category)
        .map((doc) => doc.category)
        .filter(Boolean)
    )
  ) as string[];

  const predefined = [
    "Company Policies",
    "Attendance",
    "Charter",
    "Meeting Notes",
    "Templates",
    "HR Policies",
    "Financial",
    "Operations",
    "Legal",
    "Marketing",
    "Sales",
    "Technical",
    "Training",
    "Compliance",
    "Quality Assurance",
    "Project Management",
  ];

  const all = Array.from(new Set([...predefined, ...existing]));
  if (!searchQuery) return all.sort();
  const filtered = all.filter((c) =>
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return filtered.length === 0 ? [searchQuery] : filtered.sort();
}

// Create new document or folder
export async function createDocument(
  name: string,
  type: "file" | "folder",
  parentId: string | null,
  authToken: string
): Promise<DocumentItem | null> {
  try {
    const payload = {
      name,
      title: null,
      type,
      category: null,
      status: "active",
      parent_id: parentId,
      shared: false,
      share_url: null,
      id: null,
      content: [],
    };

    const response = await apiClient.post<ApiDocumentItem>("/documents/", payload, {
      headers: {
        Authorization: authToken,
      },
    });

    return transformApiDocument(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating document:", error);
    return null;
  }
}

// Delete document or folder
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/documents/${ encodeURIComponent(documentId)}`);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error deleting document:", error);
    return false;
  }
}

// Rename document or folder
export async function renameDocument(
  documentId: string,
  newName: string
): Promise<DocumentItem | null> {
  try {
    const response = await apiClient.patch<ApiDocumentItem>(
      `/documents/${encodeURIComponent(documentId)}`,
      {
        name: newName,
      }
    );
    return transformApiDocument(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error renaming document:", error);
    return null;
  }
}

// Move document or folder to different parent
export async function moveDocument(
  documentId: string,
  newParentId: string | null
): Promise<DocumentItem | null> {
  try {
    const response = await apiClient.patch<ApiDocumentItem>(
      `/documents/${encodeURIComponent(documentId)}`,
      {
        parent_id: newParentId,
      }
    );
    return transformApiDocument(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error moving document:", error);
    return null;
  }
}

// Get all accessible folders for move operation
export async function getAllAccessibleFolders(): Promise<DocumentItem[]> {
  try {
    const response = await apiClient.get<ApiDocumentItem[]>('/documents/', {
      params: { type: 'folder' }
    });
    // Filter to ensure only folders are returned and transform
    const allFolders = response
      .filter(item => item.type === 'folder')
      .map(transformApiDocument);

    // Filter folders by edit permissions
    const accessibleFolders: DocumentItem[] = []
    for (const folder of allFolders) {
      try {
        const access = await getDocumentAccess(folder.id)
        if (access?.can_edit) {
          accessibleFolders.push(folder)
        }
      } catch (error) {
        // If permission check fails, skip this folder
        console.warn(`Failed to check permissions for folder ${folder.id}:`, error)
      }
    }

    return accessibleFolders
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching folders:", error);
    return [];
  }
}

// Update document content payload interface
export interface UpdateDocumentContentPayload {
  category?: string | null;
  content: DocumentBlock[];
}

// Update document content (for files only)
export async function updateDocumentContent(
  documentId: string,
  payload: UpdateDocumentContentPayload,
  options?: { commit?: boolean }
): Promise<DocumentItem | null> {
  try {
    const response = await apiClient.patch<ApiDocumentItem>(
      `/documents/${encodeURIComponent(documentId)}`,
      payload,
      {
        params: options?.commit !== undefined ? { commit: options.commit ? 'true' : 'false' } : undefined,
      }
    );
    return transformApiDocument(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error updating document content:", error);
    return null;
  }
}

// ===== EDIT HISTORY =====
export async function getDocumentHistory(id: string): Promise<EditHistoryEvent[]> {
  ensureAuth();
  const data = await apiClient.get<EditHistoryEvent[]>(
    `/documents/${encodeURIComponent(id)}/history`
  )
  return data;
}

// ===== DOCUMENT PERMISSION FUNCTIONS =====

// Get document permissions
export async function getDocumentPermissions(
  documentId: string
): Promise<DocumentPermissions | null> {
  try {
    const response = await apiClient.get<DocumentPermissions>(
      `/documents/${encodeURIComponent(documentId)}/permissions`
    );
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching document permissions:", error);
    return null;
  }
}

// Add user permission
export async function addUserPermission(
  documentId: string,
  permission: AddUserPermissionRequest
): Promise<boolean> {
  try {
    await apiClient.post(
      `/documents/${encodeURIComponent(documentId)}/permissions/users`,
      permission
    );
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error adding user permission:", error);
    return false;
  }
}

// Add division permission
export async function addDivisionPermission(
  documentId: string,
  permission: AddDivisionPermissionRequest
): Promise<boolean> {
  try {
    await apiClient.post(
      `/documents/${encodeURIComponent(documentId)}/permissions/divisions`,
      permission
    );
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error adding division permission:", error);
    return false;
  }
}

// Remove user permission
export async function removeUserPermission(
  documentId: string,
  userId: string
): Promise<boolean> {
  try {
    await apiClient.delete(
      `/documents/${encodeURIComponent(
        documentId
      )}/permissions/users/${encodeURIComponent(userId)}`
    );
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error removing user permission:", error);
    return false;
  }
}

// Remove division permission
export async function removeDivisionPermission(
  documentId: string,
  division: string
): Promise<boolean> {
  try {
    await apiClient.delete(
      `/documents/${encodeURIComponent(
        documentId
      )}/permissions/divisions/${encodeURIComponent(division)}`
    );
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error removing division permission:", error);
    return false;
  }
}

// Combined search result interface that can be either user or division
export interface SearchResult {
  type: "user" | "division";
  id: string;
  name: string;
  email?: string; // Only for users
  division?: string; // Only for users
  position?: string; // Only for users
  avatar?: string; // Only for users
}

// Search users and divisions for permission assignment
// The API returns both users and divisions, so we need to distinguish them
export async function searchForPermissions(
  query: string
): Promise<SearchResult[]> {
  try {
    const response = await apiClient.get<SearchUserResult[]>(
      `/employees/search?q=${encodeURIComponent(query)}`
    );
    const results: SearchResult[] = [];

    // Process each result and determine if it's a user or division
    response.forEach((item) => {
      // Check if this is a division by looking at the structure
      // Divisions typically don't have email, position, or avatar
      if (!item.email && !item.position && !item.avatar) {
        // This is likely a division
        results.push({
          type: "division",
          id: item.id,
          name: item.name,
        });
      } else {
        // This is a user
        results.push({
          type: "user",
          id: item.id,
          name: item.name,
          email: item.email,
          division: item.division,
          position: item.position,
          avatar: item.avatar,
        });
      }
    });

    return results;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error searching for permissions:", error);
    return [];
  }
}

// Keep the original searchUsers function for backward compatibility
export async function searchUsers(query: string): Promise<SearchUserResult[]> {
  try {
    const response = await apiClient.get<SearchUserResult[]>(
      `/employees/search?q=${encodeURIComponent(query)}`
    );
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error searching users:", error);
    return [];
  }
}

export interface DocumentAccess {
  can_view: boolean
  can_edit: boolean
  // opsional kalau backend ikut mengirim detail
  detail?: {
    viewer?: { direct: boolean; inherited: boolean }
    editor?: { direct: boolean; inherited: boolean }
  }
}

export async function getDocumentAccess(
  documentId: string
): Promise<DocumentAccess> {
  try {
    const endpoint = `/documents/${encodeURIComponent(documentId)}/access`
    const session = useAuthStore.getState().getCurrentSession()

    const res = await apiClient.get<DocumentAccess>(endpoint, {
      headers: session?.token
        ? { Authorization: `Bearer ${session.token}` }
        : undefined,
    })

    // fallback aman kalau BE tidak mengirim field
    return {
      can_view: Boolean(res?.can_view),
      can_edit: Boolean(res?.can_edit),
      detail: res?.detail,
    }
  } catch (error: any) {
    // 401/403: treat as no access
    const status = error?.response?.status
    if (status === 401 || status === 403) {
      return { can_view: false, can_edit: false }
    }
    // log error lain, tetap fail-safe no access
    // eslint-disable-next-line no-console
    console.error('Error fetching document access:', error)
    return { can_view: false, can_edit: false }
  }
}

export const canViewFromAccess = (access: DocumentAccess | null | undefined): boolean =>
  Boolean(access?.can_view)

export const canEditFromAccess = (access: DocumentAccess | null | undefined): boolean =>
  Boolean(access?.can_edit)

export async function canViewDocument(documentId: string): Promise<boolean> {
  const access = await getDocumentAccess(documentId)
  return access.can_view
}

export async function canEditDocument(documentId: string): Promise<boolean> {
  const access = await getDocumentAccess(documentId)
  return access.can_edit
}

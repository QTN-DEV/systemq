import axios from "axios";

import { useAuthStore } from "@/stores/authStore";

import type {
  DocumentPermissions,
  AddUserPermissionRequest,
  AddDivisionPermissionRequest,
  SearchUserResult,
} from "../types/document-permissions";
import type { DocumentItem, DocumentBlock } from "../types/document-type";
import type { EditHistoryEvent } from "../types/documents";

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://api.systemq.qtn.ai";
console.log("Document API base:", API_BASE_URL);
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Add authentication interceptor
api.interceptors.request.use((config) => {
  const session = useAuthStore.getState().getCurrentSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  // Disable caching for GET to avoid stale reads after save
  if (config.method === 'get') {
    config.headers['Cache-Control'] = 'no-cache';
    config.headers['Pragma'] = 'no-cache';
  }
  return config;
});

// Backend API response structure - matches DocumentResponse schema
interface ApiDocumentItem {
  id: string;
  name: string;
  type: "folder" | "file";
  creator_id: string;
  category: string | null;
  parent_id: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  permissions: {
    user_id?: string;
    division_id?: string;
    permission: "viewer" | "editor";
    user?: {
      id: string;
      name: string;
      email: string;
      position: string;
      avatar: string | null;
    };
    division?: {
      id: string;
      name: string;
    };
  }[];
}

// Cache for user info to avoid redundant API calls
const userInfoCache = new Map<string, { name: string; role: string; avatar?: string }>();

// Helper function to fetch user info by employee_id
async function getUserInfo(employeeId: string): Promise<{ name: string; role: string; avatar?: string }> {
  // Check cache first
  if (userInfoCache.has(employeeId)) {
    return userInfoCache.get(employeeId)!;
  }

  try {
    // Try to fetch user info from the employees endpoint
    const response = await api.get<{ id: string; name: string; position?: string; avatar?: string | null }>(`/employees/${encodeURIComponent(employeeId)}`);
    const userInfo = {
      name: response.data.name || 'Unknown',
      role: (response.data.position?.toLowerCase().replace(/\s+/g, '_') || 'employee') as string,
      avatar: response.data.avatar || undefined,
    };

    // Cache the result
    userInfoCache.set(employeeId, userInfo);
    return userInfo;
  } catch (error) {
    console.warn(`Failed to fetch user info for ${employeeId}:`, error);
    // Return fallback info
    const fallback = {
      name: employeeId,
      role: 'employee',
      avatar: undefined,
    };
    userInfoCache.set(employeeId, fallback);
    return fallback;
  }
}

// Transform API response to match our internal type (async version)
async function transformApiDocument(apiDoc: ApiDocumentItem): Promise<DocumentItem> {
  // Parse content from string to DocumentBlock array
  let contentBlocks: DocumentBlock[] = [];
  if (apiDoc.content) {
    try {
      contentBlocks = JSON.parse(apiDoc.content);
    } catch (e) {
      // If content is plain text, wrap it in a paragraph block
      contentBlocks = [{
        id: 'default',
        type: 'paragraph',
        content: apiDoc.content
      }];
    }
  }

  // Determine status based on permissions
  const hasPermissions = apiDoc.permissions && apiDoc.permissions.length > 0;
  const status = hasPermissions ? "shared" : "private";

  // Fetch creator info
  const creatorInfo = await getUserInfo(apiDoc.creator_id);

  return {
    id: apiDoc.id,
    name: apiDoc.name,
    type: apiDoc.type,
    category: apiDoc.category ?? undefined,
    status: status as "active" | "archived" | "shared" | "private",
    parentId: apiDoc.parent_id ?? undefined,
    shared: hasPermissions,
    shareUrl: undefined, // Not supported by backend
    ownedBy: {
      id: apiDoc.creator_id,
      name: creatorInfo.name,
      role: creatorInfo.role as "admin" | "manager" | "employee" | "secretary",
      avatar: creatorInfo.avatar,
    },
    dateCreated: apiDoc.created_at,
    lastModified: apiDoc.updated_at,
    lastModifiedBy: null, // Not provided by backend
    size: undefined, // Not provided by backend
    itemCount: 0, // Will be fetched separately when needed
    path: [], // Will be built using breadcrumbs endpoint
    content: contentBlocks,
    userPermissions: apiDoc.permissions
      ?.filter(p => p.user_id && p.user)
      .map((perm) => ({
        user_id: perm.user!.id,
        user_name: perm.user!.name,
        user_email: perm.user!.email,
        permission: perm.permission as "viewer" | "editor",
      })),
    divisionPermissions: apiDoc.permissions
      ?.filter(p => p.division_id && p.division)
      .map((perm) => ({
        division: perm.division!.name,
        permission: perm.permission as "viewer" | "editor",
      })),
  };
}

// Batch transform with user info fetching
async function transformApiDocuments(apiDocs: ApiDocumentItem[]): Promise<DocumentItem[]> {
  // Pre-fetch all unique creator info in parallel
  const uniqueCreatorIds = Array.from(new Set(apiDocs.map(doc => doc.creator_id)));
  await Promise.all(uniqueCreatorIds.map(id => getUserInfo(id)));

  // Transform all documents
  return Promise.all(apiDocs.map(transformApiDocument));
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
    const params = new URLSearchParams()
    params.set('q', q)
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    types?.forEach(t => params.append('types', t))

    const endpoint = `/documents/search?${params.toString()}`
    const session = useAuthStore.getState().getCurrentSession()
    const headers = session?.token ? { Authorization: `Bearer ${session.token}` } : undefined

    // Backend returns paginated response: { items: [], total: int, offset: int, limit: int }
    const res = await api.get<{ items: ApiDocumentItem[], total: number, offset: number, limit: number }>(endpoint, { headers })
    return transformApiDocuments(res.data.items)
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
    const endpoint = parentId
      ? `/documents/?parent_id=${encodeURIComponent(parentId)}`
      : "/documents/";
    // Ensure Authorization header present for new BE requirement
    const session = useAuthStore.getState().getCurrentSession();
    const response = await api.get<ApiDocumentItem[]>(endpoint, {
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
      params: { _t: Date.now() },
    });
    return transformApiDocuments(response.data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching documents:", error);
    return [];
  }
}

// Get actual item count by using the dedicated backend endpoint
export async function getActualItemCount(folderId: string): Promise<number> {
  try {
    const session = useAuthStore.getState().getCurrentSession();
    const response = await api.get<{ count: number }>(
      `/documents/${encodeURIComponent(folderId)}/item-count`,
      { headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined }
    );
    return response.data.count;
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
    // Ensure Authorization header present for new BE requirement
    const session = useAuthStore.getState().getCurrentSession();
    const response = await api.get<ApiDocumentItem>(
      `/documents/${encodeURIComponent(id)}`,
      {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
        params: { _t: Date.now() },
      }
    );
    return await transformApiDocument(response.data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching document by ID:", error);
    return null;
  }
}

// Get folder path IDs using the backend endpoint
export async function getFolderPathIds(
  folderId: string | null
): Promise<string[]> {
  if (!folderId) return [];
  try {
    const session = useAuthStore.getState().getCurrentSession();
    const response = await api.get<string[]>(
      `/documents/${encodeURIComponent(folderId)}/path-ids`,
      { headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined }
    );
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching folder path IDs:", error);
    return [];
  }
}

// Build breadcrumbs using the backend endpoint
export async function buildBreadcrumbs(
  currentFolderId: string | null
): Promise<{ id: string; name: string; path: string[] }[]> {
  const breadcrumbs: { id: string; name: string; path: string[] }[] = [
    { id: "root", name: "Documents", path: [] },
  ];
  if (!currentFolderId) return breadcrumbs;

  try {
    const session = useAuthStore.getState().getCurrentSession();
    const response = await api.get<{ id: string; name: string; type: string }[]>(
      `/documents/${encodeURIComponent(currentFolderId)}/breadcrumbs`,
      { headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined }
    );

    // Backend returns array of {id, name, type}, convert to breadcrumb format
    let currentPath: string[] = [];
    for (const item of response.data) {
      breadcrumbs.push({
        id: item.id,
        name: item.name,
        path: [...currentPath],
      });
      currentPath.push(item.name);
    }

    return breadcrumbs;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error building breadcrumbs:", error);
    return breadcrumbs;
  }
}

export async function getDocumentTypes(
  searchQuery: string = ""
): Promise<string[]> {
  try {
    // Use backend endpoint to get distinct types
    const response = await api.get<{ values: string[] }>('/documents/types');
    const types = response.data.values || [];

    if (!searchQuery) return types.sort();
    const filtered = types.filter((type) =>
      type.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.length === 0 ? [searchQuery] : filtered.sort();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching document types:", error);
    // Fallback to predefined types
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
    if (!searchQuery) return predefinedTypes.sort();
    const filtered = predefinedTypes.filter((type) =>
      type.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.length === 0 ? [searchQuery] : filtered.sort();
  }
}

export async function getDocumentCategories(
  searchQuery: string = ""
): Promise<string[]> {
  try {
    // Use backend endpoint to get distinct categories
    const response = await api.get<{ values: string[] }>('/documents/categories');
    const categories = response.data.values || [];

    if (!searchQuery) return categories.sort();
    const filtered = categories.filter((c) =>
      c.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.length === 0 ? [searchQuery] : filtered.sort();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching document categories:", error);
    // Fallback to predefined categories
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
    if (!searchQuery) return predefined.sort();
    const filtered = predefined.filter((c) =>
      c.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.length === 0 ? [searchQuery] : filtered.sort();
  }
}

// Create new document or folder
export async function createDocument(
  name: string,
  type: "file" | "folder",
  parentId: string | null,
  authToken: string
): Promise<DocumentItem | null> {
  try {
    // Backend expects: { name, type, category?, parent_id?, content?, permissions? }
    const payload = {
      name,
      type,
      parent_id: parentId,
    };

    const response = await api.post<ApiDocumentItem>("/documents/", payload, {
      headers: {
        Authorization: authToken,
      },
    });

    return await transformApiDocument(response.data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating document:", error);
    return null;
  }
}

// Delete document or folder
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    await api.delete(`/documents/${ encodeURIComponent(documentId)}`);
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
    const response = await api.patch<ApiDocumentItem>(
      `/documents/${encodeURIComponent(documentId)}`,
      {
        name: newName,
      }
    );
    return await transformApiDocument(response.data);
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
    const response = await api.patch<ApiDocumentItem>(
      `/documents/${encodeURIComponent(documentId)}`,
      {
        parent_id: newParentId,
      }
    );
    return await transformApiDocument(response.data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error moving document:", error);
    return null;
  }
}

// Get all accessible folders for move operation
export async function getAllAccessibleFolders(): Promise<DocumentItem[]> {
  try {
    const response = await api.get<ApiDocumentItem[]>('/documents/', {
      params: { type: 'folder' }
    });
    // Filter to ensure only folders are returned and transform
    const folders = response.data.filter(item => item.type === 'folder');
    const allFolders = await transformApiDocuments(folders);

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
    // Backend expects content as JSON string, not array
    const backendPayload: any = {};
    if (payload.category !== undefined) {
      backendPayload.category = payload.category;
    }
    if (payload.content) {
      backendPayload.content = JSON.stringify(payload.content);
    }

    const response = await api.patch<ApiDocumentItem>(
      `/documents/${encodeURIComponent(documentId)}`,
      backendPayload,
      {
        params: options?.commit !== undefined ? { commit: options.commit ? 'true' : 'false' } : undefined,
      }
    );
    return await transformApiDocument(response.data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error updating document content:", error);
    return null;
  }
}

// ===== EDIT HISTORY =====
export async function getDocumentHistory(id: string): Promise<EditHistoryEvent[]> {
  const res = await api.get<EditHistoryEvent[]>(
    `/documents/${encodeURIComponent(id)}/history`
  )
  if (res.status === 200) return res.data
  throw new Error('Failed to fetch edit history')
}

// ===== DOCUMENT PERMISSION FUNCTIONS =====

// Get document permissions - backend doesn't have a dedicated permissions endpoint
// Permissions are included in the main document response
export async function getDocumentPermissions(
  documentId: string
): Promise<DocumentPermissions | null> {
  try {
    // Fetch the document which includes permissions
    const doc = await getDocumentById(documentId, null);
    if (!doc) return null;

    return {
      user_permissions: doc.userPermissions || [],
      division_permissions: doc.divisionPermissions || [],
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching document permissions:", error);
    return null;
  }
}

// Add user permission - update document with new permission
export async function addUserPermission(
  documentId: string,
  permission: AddUserPermissionRequest
): Promise<boolean> {
  try {
    // Get current document
    const doc = await getDocumentById(documentId, null);
    if (!doc) return false;

    // Add new permission to existing permissions
    const userPermissions = doc.userPermissions || [];
    userPermissions.push({
      user_id: permission.user_id,
      user_name: permission.user_name || "Unknown",
      user_email: permission.user_email || "",
      permission: permission.permission as "viewer" | "editor",
    });

    // Update document with new permissions
    const response = await api.patch(
      `/documents/${encodeURIComponent(documentId)}`,
      {
        permissions: [
          ...userPermissions.map(p => ({
            user_id: p.user_id,
            permission: p.permission,
          })),
          ...(doc.divisionPermissions || []).map(p => ({
            division_id: p.division,
            permission: p.permission,
          })),
        ],
      }
    );
    return response.status === 200;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error adding user permission:", error);
    return false;
  }
}

// Add division permission - update document with new permission
export async function addDivisionPermission(
  documentId: string,
  permission: AddDivisionPermissionRequest
): Promise<boolean> {
  try {
    // Get current document
    const doc = await getDocumentById(documentId, null);
    if (!doc) return false;

    // Add new permission to existing permissions
    const divisionPermissions = doc.divisionPermissions || [];
    divisionPermissions.push({
      division: permission.division,
      permission: permission.permission as "viewer" | "editor",
    });

    // Update document with new permissions
    const response = await api.patch(
      `/documents/${encodeURIComponent(documentId)}`,
      {
        permissions: [
          ...(doc.userPermissions || []).map(p => ({
            user_id: p.user_id,
            permission: p.permission,
          })),
          ...divisionPermissions.map(p => ({
            division_id: p.division,
            permission: p.permission,
          })),
        ],
      }
    );
    return response.status === 200;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error adding division permission:", error);
    return false;
  }
}

// Remove user permission - update document without the permission
export async function removeUserPermission(
  documentId: string,
  userId: string
): Promise<boolean> {
  try {
    // Get current document
    const doc = await getDocumentById(documentId, null);
    if (!doc) return false;

    // Remove the permission
    const userPermissions = (doc.userPermissions || []).filter(p => p.user_id !== userId);

    // Update document with new permissions
    const response = await api.patch(
      `/documents/${encodeURIComponent(documentId)}`,
      {
        permissions: [
          ...userPermissions.map(p => ({
            user_id: p.user_id,
            permission: p.permission,
          })),
          ...(doc.divisionPermissions || []).map(p => ({
            division_id: p.division,
            permission: p.permission,
          })),
        ],
      }
    );
    return response.status === 200;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error removing user permission:", error);
    return false;
  }
}

// Remove division permission - update document without the permission
export async function removeDivisionPermission(
  documentId: string,
  division: string
): Promise<boolean> {
  try {
    // Get current document
    const doc = await getDocumentById(documentId, null);
    if (!doc) return false;

    // Remove the permission
    const divisionPermissions = (doc.divisionPermissions || []).filter(p => p.division !== division);

    // Update document with new permissions
    const response = await api.patch(
      `/documents/${encodeURIComponent(documentId)}`,
      {
        permissions: [
          ...(doc.userPermissions || []).map(p => ({
            user_id: p.user_id,
            permission: p.permission,
          })),
          ...divisionPermissions.map(p => ({
            division_id: p.division,
            permission: p.permission,
          })),
        ],
      }
    );
    return response.status === 200;
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
    const response = await api.get<SearchUserResult[]>(
      `/employees/search?q=${encodeURIComponent(query)}`
    );
    const results: SearchResult[] = [];

    // Process each result and determine if it's a user or division
    response.data.forEach((item) => {
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
    const response = await api.get<SearchUserResult[]>(
      `/employees/search?q=${encodeURIComponent(query)}`
    );
    return response.data;
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

    const res = await api.get<DocumentAccess>(endpoint, {
      headers: session?.token
        ? { Authorization: `Bearer ${session.token}` }
        : undefined,
    })

    // fallback aman kalau BE tidak mengirim field
    return {
      can_view: Boolean(res.data?.can_view),
      can_edit: Boolean(res.data?.can_edit),
      detail: res.data?.detail,
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

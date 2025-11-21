import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "react-router-dom";

import {
  getDocumentsByParentId,
  getDocumentById,
  buildBreadcrumbs,
  getActualItemCount,
  getDocumentAccess,
} from "@/lib/shared/services/DocumentService";
import { useAuthStore } from "@/stores/authStore";
import type { DocumentItem } from "@/types/documents";

export function useDocumentsData(): {
  currentFolderId: string | null;
  currentFolder: DocumentItem | null | undefined;
  currentItems: DocumentItem[];
  displayItems: DocumentItem[];
  breadcrumbs: { id: string; name: string; path: string[] }[];
  isSharedView: boolean;
  canEditFolder: boolean;
  isLoadingItems: boolean;
  itemsError: Error | null;
  refetchItems: () => void;
  effectiveSegments: string[];
} {
  const { "*": currentPath } = useParams<{ "*": string }>();
  const currentUser = useAuthStore((state) => state.user);

  const pathSegments = currentPath?.split("/").filter(Boolean) ?? [];
  const isSharedView = pathSegments[0] === "shared";
  const effectiveSegments = isSharedView ? pathSegments.slice(1) : pathSegments;
  const currentFolderId =
    effectiveSegments.length > 0
      ? effectiveSegments[effectiveSegments.length - 1]
      : null;

  // Fetch current folder
  const { data: currentFolder } = useQuery({
    queryKey: ["document", currentFolderId],
    queryFn: () =>
      currentFolderId ? getDocumentById(currentFolderId, null) : null,
    enabled: currentFolderId !== null && currentFolderId !== undefined,
  });

  // Fetch items in current folder
  const {
    data: currentItems = [],
    isLoading: isLoadingItems,
    error: itemsError,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["documents", currentFolderId],
    queryFn: () => getDocumentsByParentId(currentFolderId),
  });

  // Fetch breadcrumbs
  const { data: breadcrumbs = [] } = useQuery({
    queryKey: ["breadcrumbs", currentFolderId, isSharedView],
    queryFn: () => buildBreadcrumbs(currentFolderId ?? null, isSharedView),
  });

  // Fetch folder access
  const { data: folderAccess } = useQuery({
    queryKey: ["document-access", currentFolderId],
    queryFn: () =>
      currentFolderId ? getDocumentAccess(currentFolderId) : null,
    enabled: currentFolderId !== null && currentFolderId !== undefined,
  });

  const canEditFolder = folderAccess?.can_edit ?? false;

  // Check if user is System Administrator
  // Check both position and role fields, with case-insensitive matching for level
  const isSystemAdmin = Boolean(
    currentUser &&
    (currentUser.position === "Admin" ||
      currentUser.role === "admin" ||
      (typeof currentUser.level === "string" &&
        ["admin", "administrator", "superadmin", "principal"].includes(
          currentUser.level.toLowerCase()
        )))
  );

  // Filter items based on view (My vs Shared) and ensure only items in current folder are shown
  // When at root (currentFolderId === null), only show items with no parent
  // When in a subfolder, only show items with parentId matching currentFolderId
  const displayItems = useMemo(() => {
    // First, filter by parent folder to ensure we only show items in the current folder
    let filtered = currentItems;
    if (currentFolderId === null) {
      // At root: only show items with no parent
      filtered = currentItems.filter((item) => !item.parentId);
    } else {
      // In subfolder: only show items with parentId matching currentFolderId
      filtered = currentItems.filter((item) => item.parentId === currentFolderId);
    }
    
    if (!currentUser) return filtered;
    
    // System Administrators see all documents in "My Documents" view (but still filtered by parent)
    if (!isSharedView && isSystemAdmin) {
      return filtered; // Show all documents for System Admin in "My Documents" (but only in current folder)
    }
    
    const myId = currentUser.id;
    
    return filtered.filter((item: DocumentItem) => {
      if (isSharedView) {
        // Shared view: show items not owned by current user
        return item.ownedBy?.id !== myId;
      } else {
        // My Documents view: show only documents owned by current user
        return item.ownedBy?.id === myId;
      }
    });
  }, [currentItems, currentUser, isSharedView, isSystemAdmin, currentFolderId]);

  return {
    currentFolderId,
    currentFolder,
    currentItems,
    displayItems,
    breadcrumbs,
    isSharedView,
    canEditFolder,
    isLoadingItems,
    itemsError,
    refetchItems,
    effectiveSegments,
  };
}

// Hook untuk fetch item counts
export function useDocumentCounts(items: DocumentItem[]): Record<string, number> {
  const folderIds = items
    .filter((item) => item.type === "folder")
    .map((item) => item.id);

  const queries = useQuery({
    queryKey: ["document-counts", folderIds],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const id of folderIds) {
        try {
          counts[id] = await getActualItemCount(id);
        } catch {
          counts[id] = 0;
        }
      }
      return counts;
    },
    enabled: folderIds.length > 0,
  });

  return queries.data ?? {};
}

// Hook untuk fetch permissions
export function useDocumentPermissions(items: DocumentItem[]): Record<string, boolean> {
  const itemIds = items.map((item) => item.id);

  const queries = useQuery({
    queryKey: ["document-permissions", itemIds],
    queryFn: async () => {
      const permissions: Record<string, boolean> = {};
      for (const id of itemIds) {
        try {
          const access = await getDocumentAccess(id);
          permissions[id] = Boolean(access?.can_edit);
        } catch {
          permissions[id] = false;
        }
      }
      return permissions;
    },
    enabled: itemIds.length > 0,
  });

  return queries.data ?? {};
}

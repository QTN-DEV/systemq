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

export function useDocumentsData() {
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
    enabled: Boolean(currentFolderId),
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
    enabled: Boolean(currentFolderId),
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

  // Filter items based on view (My vs Shared)
  // System Administrators see all documents globally in "My Documents" view
  const displayItems = useMemo(() => {
    if (!currentUser) return currentItems;
    
    // System Administrators see all documents in "My Documents" view
    if (!isSharedView && isSystemAdmin) {
      return currentItems; // Show all documents for System Admin in "My Documents"
    }
    
    const myId = currentUser.id;
    
    return currentItems.filter((item: DocumentItem) => {
      if (isSharedView) {
        // Shared view: show items not owned by current user
        return item.ownedBy?.id !== myId;
      } else {
        // My Documents view: show only documents owned by current user
        return item.ownedBy?.id === myId;
      }
    });
  }, [currentItems, currentUser, isSharedView, isSystemAdmin]);

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
export function useDocumentCounts(items: DocumentItem[]) {
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
export function useDocumentPermissions(items: DocumentItem[]) {
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

import { useState, useMemo, useEffect } from "react";

import type { AuthenticatedUser } from "@/lib/shared/services/authService";
import { useAuthStore } from "@/stores/authStore";
import type { DocumentItem, DocumentBreadcrumb } from "@/types/documents";

import {
  useDocumentsData,
  useDocumentCounts,
  useDocumentPermissions,
  useDocumentsSearch,
  useDocumentsFilter,
  useDocumentsPagination,
  useDocumentsActions,
  useDocumentsContributors,
  useContributorsModal,
  useDocumentsNavigation,
} from ".";

export interface GlobalDocumentsState {
  // User
  currentUser: AuthenticatedUser | null;

  // Data
  currentFolderId: string | null;
  currentFolder: DocumentItem | null;
  displayItems: DocumentItem[];
  breadcrumbs: DocumentBreadcrumb[];
  isSharedView: boolean;
  canEditFolder: boolean;
  isLoadingItems: boolean;
  itemsError: string | null;
  refetchItems: () => void;
  effectiveSegments: string[];

  // Counts & Permissions
  itemCounts: Record<string, number>;
  itemPermissions: Record<string, boolean>;

  // Search
  globalQuery: string;
  setGlobalQuery: (query: string) => void;
  globalResults: DocumentItem[];
  globalLoading: boolean;
  globalError: string | null;

  // Filter
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  categories: string[];
  filteredItems: DocumentItem[];

  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (rows: number) => void;
  totalPages: number;
  startIndex: number;
  paginatedItems: DocumentItem[];
  foldersOnPage: DocumentItem[];
  documentsOnPage: DocumentItem[];
  hasFolderResults: boolean;
  hasDocumentResults: boolean;

  // Actions
  createMutation: ReturnType<typeof useDocumentsActions>["createMutation"];
  renameMutation: ReturnType<typeof useDocumentsActions>["renameMutation"];
  deleteMutation: ReturnType<typeof useDocumentsActions>["deleteMutation"];
  error: string | null;
  setError: (error: string | null) => void;
  validateName: (
    name: string,
    items: DocumentItem[],
    excludeId?: string
  ) => string | null;

  // Contributors
  contributorsMap: Record<string, string[]>;
  prefetchContributors: (items: DocumentItem[]) => Promise<void>;
  fetchedContribIdsRef: React.MutableRefObject<Set<string>>;
  showContributors: boolean;
  contributorsList: string[];
  contributorsForName: string;
  openContributors: (item: DocumentItem, contributors: string[]) => void;
  closeContributors: () => void;

  // Navigation
  handleItemClick: (item: DocumentItem) => void;
  handleOpenSearchItem: (item: DocumentItem) => Promise<void>;
  handleBreadcrumbClick: (breadcrumb: DocumentBreadcrumb) => void;

  // Modal States
  showCreateFolder: boolean;
  setShowCreateFolder: (show: boolean) => void;
  showCreateFile: boolean;
  setShowCreateFile: (show: boolean) => void;
  showRenameModal: boolean;
  setShowRenameModal: (show: boolean) => void;
  showDeleteModal: boolean;
  setShowDeleteModal: (show: boolean) => void;
  showPermissionModal: boolean;
  setShowPermissionModal: (show: boolean) => void;
  showMoveModal: boolean;
  setShowMoveModal: (show: boolean) => void;
  selectedItem: DocumentItem | null;
  setSelectedItem: (item: DocumentItem | null) => void;

  // Helper Functions
  isOwner: (item: DocumentItem) => boolean;
  isSystemAdmin: boolean;
  canCreateHere: boolean;
  emptyState: {
    title: string;
    description: string;
    showActions: boolean;
  } | null;

  // Action Handlers
  handleCreateFolder: (name: string) => Promise<void>;
  handleCreateFile: (name: string) => Promise<void>;
  handleRenameSubmit: (name: string) => Promise<void>;
  handleDeleteConfirm: () => Promise<void>;
}

export function useGlobalDocuments(): GlobalDocumentsState {
  const currentUser = useAuthStore((state) => state.user);

  // Data Hooks
  const {
    currentFolderId,
    currentFolder,
    displayItems,
    breadcrumbs,
    isSharedView,
    canEditFolder,
    isLoadingItems,
    itemsError,
    refetchItems,
    effectiveSegments,
  } = useDocumentsData();

  const itemCounts = useDocumentCounts(displayItems);
  const itemPermissions = useDocumentPermissions(displayItems);

  // Search & Filter Hooks
  const {
    globalQuery,
    setGlobalQuery,
    globalResults,
    globalLoading,
    globalError,
  } = useDocumentsSearch();

  const { activeFilter, setActiveFilter, categories, filteredItems } =
    useDocumentsFilter(displayItems);

  // Pagination Hook
  const {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    startIndex,
    paginatedItems,
    foldersOnPage,
    documentsOnPage,
    hasFolderResults,
    hasDocumentResults,
  } = useDocumentsPagination(filteredItems);

  // Actions Hook
  const {
    createMutation,
    renameMutation,
    deleteMutation,
    error,
    setError,
    validateName,
  } = useDocumentsActions(currentFolderId);

  // Contributors Hook
  const { contributorsMap, prefetchContributors, fetchedContribIdsRef } =
    useDocumentsContributors();

  const {
    showContributors,
    contributorsList,
    contributorsForName,
    openContributors,
    closeContributors,
  } = useContributorsModal();

  // Navigation Hook
  const { handleItemClick, handleOpenSearchItem, handleBreadcrumbClick } =
    useDocumentsNavigation(isSharedView, effectiveSegments);

  // Modal States
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DocumentItem | null>(null);

  // Helper Functions
  const isOwner = (item: DocumentItem): boolean =>
    Boolean(currentUser?.id && item.ownedBy?.id === currentUser.id);

  // Check if user is System Administrator
  const isSystemAdmin = Boolean(
    currentUser &&
    (currentUser.position === "Admin" ||
      currentUser.role === "admin" ||
      (typeof currentUser.level === "string" &&
        ["admin", "administrator", "superadmin", "principal"].includes(
          currentUser.level.toLowerCase()
        )))
  );

  const canCreateHere =
    !isSharedView && (currentFolderId ? canEditFolder : true);

  // Empty State Logic
  const emptyState = useMemo(() => {
    if (isLoadingItems || error || filteredItems.length > 0) {
      return null;
    }

    return {
      title:
        activeFilter !== "All"
          ? "No documents match this category"
          : isSharedView
          ? currentFolderId
            ? "No shared items in this folder"
            : "Nothing has been shared with you yet"
          : currentFolderId
          ? "This folder is empty"
          : "Create your first document",
      description:
        activeFilter !== "All"
          ? "Try choosing a different category filter to see more files."
          : isSharedView
          ? currentFolderId
            ? "Only files that are shared with you will show up here."
            : "When teammates share folders or documents, they will appear in this list."
          : currentFolderId
          ? canCreateHere
            ? "Use the buttons below to add a new folder or document."
            : "You can view this folder but do not have permission to add items."
          : "Start by adding a folder or document. Everything you create will appear here.",
      showActions: canCreateHere && !isSharedView,
    };
  }, [
    isLoadingItems,
    error,
    filteredItems.length,
    activeFilter,
    isSharedView,
    currentFolderId,
    canCreateHere,
  ]);

  // Prefetch contributors
  useEffect(() => {
    const toFetch = foldersOnPage.filter(
      (i) => !fetchedContribIdsRef.current.has(i.id)
    );
    if (toFetch.length === 0) return;
    toFetch.forEach((i) => fetchedContribIdsRef.current.add(i.id));
    void prefetchContributors(toFetch);
  }, [foldersOnPage, prefetchContributors, fetchedContribIdsRef]);

  // Action Handlers
  const handleCreateFolder = async (name: string) => {
    const validationError = validateName(name, displayItems);
    if (validationError) {
      setError(validationError);
      return;
    }

    await createMutation.mutateAsync({ name, type: "folder" });
    setShowCreateFolder(false);
  };

  const handleCreateFile = async (name: string) => {
    const validationError = validateName(name, displayItems);
    if (validationError) {
      setError(validationError);
      return;
    }

    await createMutation.mutateAsync({ name, type: "file" });
    setShowCreateFile(false);
  };

  const handleRenameSubmit = async (name: string) => {
    if (!selectedItem) return;

    const validationError = validateName(name, displayItems, selectedItem.id);
    if (validationError) {
      setError(validationError);
      return;
    }

    await renameMutation.mutateAsync({ id: selectedItem.id, name });
    setShowRenameModal(false);
    setSelectedItem(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem || (!isSystemAdmin && !isOwner(selectedItem))) {
      setError("Only the owner or system administrator can delete this item.");
      setShowDeleteModal(false);
      setSelectedItem(null);
      return;
    }

    await deleteMutation.mutateAsync(selectedItem.id);
    setShowDeleteModal(false);
    setSelectedItem(null);
  };

  return {
    // User
    currentUser,

    // Data
    currentFolderId,
    currentFolder: currentFolder ?? null,
    displayItems,
    breadcrumbs,
    isSharedView,
    canEditFolder,
    isLoadingItems,
    itemsError: itemsError ? itemsError.message : null,
    refetchItems,
    effectiveSegments,

    // Counts & Permissions
    itemCounts,
    itemPermissions,

    // Search
    globalQuery,
    setGlobalQuery,
    globalResults,
    globalLoading,
    globalError,

    // Filter
    activeFilter,
    setActiveFilter,
    categories,
    filteredItems,

    // Pagination
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    startIndex,
    paginatedItems,
    foldersOnPage,
    documentsOnPage,
    hasFolderResults,
    hasDocumentResults,

    // Actions
    createMutation,
    renameMutation,
    deleteMutation,
    error,
    setError,
    validateName,

    // Contributors
    contributorsMap,
    prefetchContributors,
    fetchedContribIdsRef,
    showContributors,
    contributorsList,
    contributorsForName,
    openContributors,
    closeContributors,

    // Navigation
    handleItemClick,
    handleOpenSearchItem,
    handleBreadcrumbClick,

    // Modal States
    showCreateFolder,
    setShowCreateFolder,
    showCreateFile,
    setShowCreateFile,
    showRenameModal,
    setShowRenameModal,
    showDeleteModal,
    setShowDeleteModal,
    showPermissionModal,
    setShowPermissionModal,
    showMoveModal,
    setShowMoveModal,
    selectedItem,
    setSelectedItem,

    // Helper Functions
    isOwner,
    isSystemAdmin,
    canCreateHere,
    emptyState,

    // Action Handlers
    handleCreateFolder,
    handleCreateFile,
    handleRenameSubmit,
    handleDeleteConfirm,
  };
}

// Barrel export for hooks
export { useDocumentsData, useDocumentCounts, useDocumentPermissions } from "./useDocumentsData";
export { useDocumentsSearch } from "./useDocumentsSearch";
export { useDocumentsFilter } from "./useDocumentsFilter";
export { useDocumentsPagination } from "./useDocumentsPagination";
export { useDocumentsActions } from "./useDocumentsActions";
export { useDocumentsContributors, useContributorsModal } from "./useDocumentsContributors";
export { useDocumentsNavigation } from "./useDocumentsNavigation";

// Global hook (combines all hooks)
export { useGlobalDocuments } from "./useGlobalDocuments";
export type { GlobalDocumentsState } from "./useGlobalDocuments";

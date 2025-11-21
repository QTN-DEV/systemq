import { useMemo } from "react";

import type { DocumentItem } from "@/types/documents";

export function useDocumentsPagination(filteredItems: DocumentItem[]): {
  paginatedItems: DocumentItem[];
  foldersOnPage: DocumentItem[];
  documentsOnPage: DocumentItem[];
  hasFolderResults: boolean;
  hasDocumentResults: boolean;
} {
  // No pagination - show all items
  const paginatedItems = filteredItems;

  const foldersOnPage = useMemo(
    () => paginatedItems.filter((item) => item.type === "folder"),
    [paginatedItems]
  );

  const documentsOnPage = useMemo(
    () => paginatedItems.filter((item) => item.type === "file"),
    [paginatedItems]
  );

  const hasFolderResults = useMemo(
    () => filteredItems.some((item) => item.type === "folder"),
    [filteredItems]
  );

  const hasDocumentResults = useMemo(
    () => filteredItems.some((item) => item.type === "file"),
    [filteredItems]
  );

  return {
    paginatedItems,
    foldersOnPage,
    documentsOnPage,
    hasFolderResults,
    hasDocumentResults,
  };
}

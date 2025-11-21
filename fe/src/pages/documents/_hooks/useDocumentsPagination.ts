import { useState, useMemo } from "react";

import type { DocumentItem } from "@/types/documents";

export function useDocumentsPagination(filteredItems: DocumentItem[]): {
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
} {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const totalPages = Math.ceil(filteredItems.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;

  const paginatedItems = useMemo(
    () => filteredItems.slice(startIndex, startIndex + rowsPerPage),
    [filteredItems, startIndex, rowsPerPage]
  );

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
  };
}

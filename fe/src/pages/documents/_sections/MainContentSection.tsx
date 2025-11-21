import type { ReactElement } from "react";

import type { DocumentItem } from "@/types/documents";

import { DocumentsGrid, DocumentsPagination } from "../_components";

interface MainContentSectionProps {
  paginatedItems: DocumentItem[];
  itemCounts: Record<string, number>;
  itemPermissions: Record<string, boolean>;
  contributorsMap: Record<string, string[]>;
  isSharedView: boolean;
  hasFolderResults: boolean;
  hasDocumentResults: boolean;
  isOwner: (item: DocumentItem) => boolean;
  isSystemAdmin: boolean;
  onItemClick: (item: DocumentItem) => void;
  onOpenContributors: (item: DocumentItem, contributors: string[]) => void;
  onRename: (item: DocumentItem) => void;
  onMove: (item: DocumentItem) => void;
  onDelete: (item: DocumentItem) => void;
  onShare: (item: DocumentItem) => void;
  onCreateFile: () => void;
  currentPage: number;
  totalPages: number;
  rowsPerPage: number;
  startIndex: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

export function MainContentSection({
  paginatedItems,
  itemCounts,
  itemPermissions,
  contributorsMap,
  isSharedView,
  hasFolderResults,
  hasDocumentResults,
  isOwner,
  isSystemAdmin,
  onItemClick,
  onOpenContributors,
  onRename,
  onMove,
  onDelete,
  onShare,
  onCreateFile,
  currentPage,
  totalPages,
  rowsPerPage,
  startIndex,
  totalItems,
  onPageChange,
  onRowsPerPageChange,
}: MainContentSectionProps): ReactElement {
  return (
    <>
      <DocumentsGrid
        items={paginatedItems}
        itemCounts={itemCounts}
        itemPermissions={itemPermissions}
        contributorsMap={contributorsMap}
        isSharedView={isSharedView}
        isOwner={isOwner}
        isSystemAdmin={isSystemAdmin}
        onItemClick={onItemClick}
        onOpenContributors={onOpenContributors}
        onRename={onRename}
        onMove={onMove}
        onDelete={onDelete}
        onShare={onShare}
        type="folder"
        title="Folders"
        emptyMessage={
          hasFolderResults
            ? "No folders on this page."
            : isSharedView
            ? "No shared folders available."
            : "No folders yet."
        }
      />

      <DocumentsGrid
        items={paginatedItems}
        itemCounts={itemCounts}
        itemPermissions={itemPermissions}
        contributorsMap={contributorsMap}
        isSharedView={isSharedView}
        isOwner={isOwner}
        isSystemAdmin={isSystemAdmin}
        onItemClick={onItemClick}
        onOpenContributors={onOpenContributors}
        onRename={onRename}
        onMove={onMove}
        onDelete={onDelete}
        onShare={onShare}
        type="file"
        title="Documents"
        showAddButton={!isSharedView}
        onAdd={onCreateFile}
        emptyMessage={
          hasDocumentResults
            ? "No documents on this page."
            : isSharedView
            ? "No shared documents available."
            : "No documents yet."
        }
      />

      <DocumentsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
        startIndex={startIndex}
        totalItems={totalItems}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  );
}

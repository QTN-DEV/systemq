import type { ReactElement } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  DocumentsBreadcrumb,
  DocumentsHeader,
  DocumentsToolbar,
  DocumentsEmptyState,
} from "./_components";
import { useGlobalDocuments } from "./_hooks";
import {
  ErrorStateSection,
  LoadingStateSection,
  MainContentSection,
  ModalsSection,
  SearchResultsSection,
} from "./_sections";

export default function DocumentsPage(): ReactElement {
  const docs = useGlobalDocuments();

  return (
    <div className="p-8">
      <DocumentsBreadcrumb
        breadcrumbs={docs.breadcrumbs}
        onBreadcrumbClick={docs.handleBreadcrumbClick}
      />

      <DocumentsHeader
        currentFolder={docs.currentFolder}
        canEditFolder={docs.canEditFolder}
        isSharedView={docs.isSharedView}
        onShare={() => {
          if (docs.currentFolder) {
            docs.setSelectedItem(docs.currentFolder);
            docs.setShowPermissionModal(true);
          }
        }}
        onCreateFolder={() => docs.setShowCreateFolder(true)}
      />

      <DocumentsToolbar
        categories={docs.categories}
        activeFilter={docs.activeFilter}
        onFilterChange={(filter) => {
          docs.setActiveFilter(filter);
          docs.setCurrentPage(1);
        }}
        globalQuery={docs.globalQuery}
        onQueryChange={docs.setGlobalQuery}
        onClearQuery={() => docs.setGlobalQuery("")}
      />

      {docs.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{docs.error}</AlertDescription>
        </Alert>
      )}

      {docs.globalQuery.trim().length >= 2 ? (
        <SearchResultsSection
          globalQuery={docs.globalQuery}
          globalResults={docs.globalResults}
          globalLoading={docs.globalLoading}
          globalError={docs.globalError}
          onOpenSearchItem={docs.handleOpenSearchItem}
        />
      ) : docs.isLoadingItems ? (
        <LoadingStateSection />
      ) : docs.itemsError ? (
        <ErrorStateSection error="Failed to load documents. Please try again." />
      ) : docs.emptyState ? (
        <DocumentsEmptyState
          emptyState={docs.emptyState}
          onCreateFolder={() => docs.setShowCreateFolder(true)}
          onCreateFile={() => docs.setShowCreateFile(true)}
        />
      ) : (
        <MainContentSection
          paginatedItems={docs.paginatedItems}
          itemCounts={docs.itemCounts}
          itemPermissions={docs.itemPermissions}
          contributorsMap={docs.contributorsMap}
          isSharedView={docs.isSharedView}
          hasFolderResults={docs.hasFolderResults}
          hasDocumentResults={docs.hasDocumentResults}
          isOwner={docs.isOwner}
          onItemClick={docs.handleItemClick}
          onOpenContributors={docs.openContributors}
          onRename={(item) => {
            docs.setSelectedItem(item);
            docs.setShowRenameModal(true);
          }}
          onMove={(item) => {
            if (docs.isOwner(item)) {
              docs.setSelectedItem(item);
              docs.setShowMoveModal(true);
            }
          }}
          onDelete={(item) => {
            if (docs.isOwner(item)) {
              docs.setSelectedItem(item);
              docs.setShowDeleteModal(true);
            }
          }}
          onShare={(item) => {
            docs.setSelectedItem(item);
            docs.setShowPermissionModal(true);
          }}
          onCreateFile={() => docs.setShowCreateFile(true)}
          currentPage={docs.currentPage}
          totalPages={docs.totalPages}
          rowsPerPage={docs.rowsPerPage}
          startIndex={docs.startIndex}
          totalItems={docs.filteredItems.length}
          onPageChange={docs.setCurrentPage}
          onRowsPerPageChange={(rows) => {
            docs.setRowsPerPage(rows);
            docs.setCurrentPage(1);
          }}
        />
      )}

      <ModalsSection
        showContributors={docs.showContributors}
        contributorsList={docs.contributorsList}
        contributorsForName={docs.contributorsForName}
        onCloseContributors={docs.closeContributors}
        showCreateFolder={docs.showCreateFolder}
        onCloseCreateFolder={() => docs.setShowCreateFolder(false)}
        onCreateFolder={docs.handleCreateFolder}
        isCreating={docs.createMutation.isPending}
        showCreateFile={docs.showCreateFile}
        onCloseCreateFile={() => docs.setShowCreateFile(false)}
        onCreateFile={docs.handleCreateFile}
        showRenameModal={docs.showRenameModal}
        onCloseRename={() => {
          docs.setShowRenameModal(false);
          docs.setSelectedItem(null);
        }}
        onRenameSubmit={docs.handleRenameSubmit}
        isRenaming={docs.renameMutation.isPending}
        selectedItem={docs.selectedItem}
        showDeleteModal={docs.showDeleteModal}
        onCloseDelete={() => {
          docs.setShowDeleteModal(false);
          docs.setSelectedItem(null);
        }}
        onDeleteConfirm={docs.handleDeleteConfirm}
        isDeleting={docs.deleteMutation.isPending}
        showPermissionModal={docs.showPermissionModal}
        onClosePermission={() => {
          docs.setShowPermissionModal(false);
          docs.setSelectedItem(null);
        }}
        showMoveModal={docs.showMoveModal}
        onCloseMove={() => {
          docs.setShowMoveModal(false);
          docs.setSelectedItem(null);
        }}
        onMoveSuccess={() => docs.refetchItems()}
      />
    </div>
  );
}

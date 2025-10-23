import type { ReactElement } from "react";

import MoveDocumentModal from "@/components/MoveDocumentModal";
import ShareDocumentModal from "@/components/ShareDocumentModal";
import type { DocumentItem } from "@/types/documents";

import { ContributorsModal } from "../_components";
import {
  CreateFolderForm,
  CreateFileForm,
  RenameForm,
  DeleteConfirmForm,
} from "../_forms";

interface ModalsSectionProps {
  // Contributors Modal
  showContributors: boolean;
  contributorsList: string[];
  contributorsForName: string;
  onCloseContributors: () => void;

  // Create Folder Modal
  showCreateFolder: boolean;
  onCloseCreateFolder: () => void;
  onCreateFolder: (name: string) => Promise<void>;
  isCreating: boolean;

  // Create File Modal
  showCreateFile: boolean;
  onCloseCreateFile: () => void;
  onCreateFile: (name: string) => Promise<void>;

  // Rename Modal
  showRenameModal: boolean;
  onCloseRename: () => void;
  onRenameSubmit: (name: string) => Promise<void>;
  isRenaming: boolean;
  selectedItem: DocumentItem | null;

  // Delete Modal
  showDeleteModal: boolean;
  onCloseDelete: () => void;
  onDeleteConfirm: () => Promise<void>;
  isDeleting: boolean;

  // Permission Modal
  showPermissionModal: boolean;
  onClosePermission: () => void;

  // Move Modal
  showMoveModal: boolean;
  onCloseMove: () => void;
  onMoveSuccess: () => void;
}

export function ModalsSection({
  showContributors,
  contributorsList,
  contributorsForName,
  onCloseContributors,
  showCreateFolder,
  onCloseCreateFolder,
  onCreateFolder,
  isCreating,
  showCreateFile,
  onCloseCreateFile,
  onCreateFile,
  showRenameModal,
  onCloseRename,
  onRenameSubmit,
  isRenaming,
  selectedItem,
  showDeleteModal,
  onCloseDelete,
  onDeleteConfirm,
  isDeleting,
  showPermissionModal,
  onClosePermission,
  showMoveModal,
  onCloseMove,
  onMoveSuccess,
}: ModalsSectionProps): ReactElement {
  return (
    <>
      <ContributorsModal
        isOpen={showContributors}
        onClose={onCloseContributors}
        contributors={contributorsList}
        itemName={contributorsForName}
      />

      <CreateFolderForm
        isOpen={showCreateFolder}
        onClose={onCloseCreateFolder}
        onSubmit={onCreateFolder}
        isLoading={isCreating}
      />

      <CreateFileForm
        isOpen={showCreateFile}
        onClose={onCloseCreateFile}
        onSubmit={onCreateFile}
        isLoading={isCreating}
      />

      <RenameForm
        isOpen={showRenameModal}
        onClose={onCloseRename}
        onSubmit={onRenameSubmit}
        item={selectedItem}
        isLoading={isRenaming}
      />

      <DeleteConfirmForm
        isOpen={showDeleteModal}
        onClose={onCloseDelete}
        onConfirm={onDeleteConfirm}
        item={selectedItem}
        isLoading={isDeleting}
      />

      {showPermissionModal && selectedItem && (
        <ShareDocumentModal
          isOpen={showPermissionModal}
          onClose={onClosePermission}
          documentId={selectedItem.id}
          documentName={selectedItem.name}
        />
      )}

      {showMoveModal && selectedItem && (
        <MoveDocumentModal
          isOpen={showMoveModal}
          onClose={onCloseMove}
          documentId={selectedItem.id}
          documentName={selectedItem.name}
          currentParentId={selectedItem.parentId}
          onMoveSuccess={onMoveSuccess}
        />
      )}
    </>
  );
}

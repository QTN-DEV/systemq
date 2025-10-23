import type { ReactElement } from 'react';
import { useState } from 'react';

import EditHistorySidebar from '@/components/EditHistorySidebar';
import ShareDocumentModal from '@/components/ShareDocumentModal';
import { useAuthStore } from '@/stores/authStore';

import { useDocumentEditor, useDocumentAccess, useDocumentHistory } from './_hooks';
import { EditorHeader, EditorContent, NotFoundSection } from './_sections';

export default function DocumentEditorPage(): ReactElement {
  const getCurrentSession = useAuthStore((s) => s.getCurrentSession);
  const [showShareModal, setShowShareModal] = useState(false);

  // Custom hooks
  const {
    fileId,
    document,
    blocks,
    fileName,
    documentCategory,
    handleSave,
    handleNameChange,
    handleCategoryChange,
  } = useDocumentEditor();

  const { canEdit } = useDocumentAccess(fileId);

  const { showHistory, history, historyError, openHistory, closeHistory } =
    useDocumentHistory(fileId);

  // Check if user is owner or has edit permission
  const showHistoryButton =
    document?.ownedBy?.id === getCurrentSession()?.user.id || canEdit;

  if (!document || document.type !== 'file') {
    return <NotFoundSection />;
  }

  return (
    <>
      <div className="h-screen min-h-screen bg-white flex">
        <div className="flex flex-col flex-1 min-w-0 bg-white">
          {/* Header */}
          <EditorHeader
            document={document}
            fileName={fileName}
            canEdit={canEdit}
            onOpenShare={() => setShowShareModal(true)}
            onOpenHistory={() => {
              void openHistory();
            }}
            showHistory={showHistory}
            showHistoryButton={showHistoryButton}
          />

          {/* Main Content */}
          <div className="flex flex-1 flex-col bg-white min-h-0 overflow-hidden">
            <div
              className={`flex-1 min-h-0 overflow-y-auto transition-[padding] duration-300 ease-in-out ${
                showHistory ? 'xl:pr-8 2xl:pr-12' : ''
              }`}
            >
              <EditorContent
                document={document}
                fileName={fileName}
                documentCategory={documentCategory}
                blocks={blocks}
                canEdit={canEdit}
                onNameChange={handleNameChange}
                onCategoryChange={handleCategoryChange}
                onSave={handleSave}
              />
            </div>
          </div>
        </div>

        {/* Edit History Sidebar */}
        {showHistory && (
          <EditHistorySidebar
            isOpen={showHistory}
            onClose={closeHistory}
            events={history}
            error={historyError}
          />
        )}
      </div>

      {/* Share Document Modal */}
      {fileId && (
        <ShareDocumentModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          documentId={fileId}
          documentName={fileName || 'Untitled Document'}
        />
      )}
    </>
  );
}

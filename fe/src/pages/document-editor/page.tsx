import { useState, type ReactElement } from 'react';
import type { Editor } from '@tiptap/react';

import EditHistorySidebar from '@/components/EditHistorySidebar';
import ShareDocumentModal from '@/components/ShareDocumentModal';
import { TipTapToolbar } from '@/components/modules/DocumentEditor/_components/TipTapToolbar';
import { useAuthStore } from '@/stores/authStore';

import { useTipTapEditor, useDocumentAccess, useDocumentHistory } from './_hooks';
import { EditorHeader, EditorContentTipTap, NotFoundSection } from './_sections';

export default function DocumentEditorPage(): ReactElement {
  const getCurrentSession = useAuthStore((s) => s.getCurrentSession);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);

  // Custom hooks - Using TipTap editor
  const {
    fileId,
    document,
    contentHtml,
    fileName,
    documentCategory,
    handleSave,
    handleNameChange,
    handleCategoryChange,
  } = useTipTapEditor();

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
            documentCategory={documentCategory}
            canEdit={canEdit}
            onOpenShare={() => setShowShareModal(true)}
            onOpenHistory={() => {
              void openHistory();
            }}
            onCategoryChange={handleCategoryChange}
            onNameChange={handleNameChange}
            showHistory={showHistory}
            showHistoryButton={showHistoryButton}
          />

          {/* Toolbar */}
          {canEdit && editor && (
            <div className="w-full bg-white border-b border-gray-200">
              <TipTapToolbar editor={editor} />
            </div>
          )}

          {/* Main Content */}
          <div className="flex flex-1 flex-col bg-gray-50 min-h-0 overflow-hidden">
            <div
              className={`flex-1 min-h-0 overflow-y-auto transition-[padding] duration-300 ease-in-out ${
                showHistory ? 'xl:pr-8 2xl:pr-12' : ''
              }`}
            >
              <EditorContentTipTap
                contentHtml={contentHtml}
                initialBlocks={document?.content} // For migration: convert blocks if HTML missing
                canEdit={canEdit}
                onSave={handleSave}
                onEditorReady={setEditor}
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

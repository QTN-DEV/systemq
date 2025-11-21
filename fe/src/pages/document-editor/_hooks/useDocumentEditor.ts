import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { logger } from '@/lib/logger';
import {
  getDocumentById,
  updateDocumentContent,
  renameDocument,
} from '@/lib/shared/services/DocumentService';
import { useAuthStore } from '@/stores/authStore';
import type { DocumentItem, DocumentBlock } from '@/types/documents';

export function useDocumentEditor() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const getCurrentSession = useAuthStore((s) => s.getCurrentSession);

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
  const [fileName, setFileName] = useState('');
  const [documentCategory, setDocumentCategory] = useState<string>('');
  const [idleCommitTimer, setIdleCommitTimer] = useState<number | null>(null);

  const isBlocksEqual = (a: DocumentBlock[] | undefined, b: DocumentBlock[]): boolean => {
    try {
      return JSON.stringify(a ?? []) === JSON.stringify(b);
    } catch {
      return false;
    }
  };

  // Load document
  useEffect(() => {
    if (!fileId) return;

    const loadDocument = async (): Promise<void> => {
      const session = getCurrentSession();
      if (!session) {
        void navigate('/login');
        return;
      }

      const doc = await getDocumentById(fileId, null).catch(() => null);
      if (!doc || doc.type !== 'file') {
        void navigate('/documents');
        return;
      }

      setDocument(doc);
      setFileName(doc.name);
      setDocumentCategory(doc.category ?? '');

      if (doc.content && doc.content.length > 0) {
        setBlocks(doc.content);
      } else {
        setBlocks([]);
      }
    };

    void loadDocument();
  }, [fileId, getCurrentSession, navigate]);

  const scheduleIdleCommit = useCallback(
    (blocksForCommit: DocumentBlock[]): void => {
      if (idleCommitTimer) {
        window.clearTimeout(idleCommitTimer);
      }
      const tid = window.setTimeout(async () => {
        if (fileId && document && !isBlocksEqual(document.content, blocksForCommit)) {
          try {
            const updatedDoc = await updateDocumentContent(
              fileId,
              {
                category: documentCategory ? documentCategory : null,
                content: blocksForCommit,
              },
              { commit: true }
            );
            // Update document state with latest timestamp after autosave
            if (updatedDoc) {
              setDocument(updatedDoc);
            }
          } catch (error) {
            logger.error('Failed to commit document changes:', error);
          }
        }
      }, 10000); // 10s idle commit window
      setIdleCommitTimer(tid);
    },
    [idleCommitTimer, fileId, document, documentCategory]
  );

  const handleSave = useCallback(
    async (newBlocks: DocumentBlock[]): Promise<void> => {
      setBlocks(newBlocks);
      if (fileId && document) {
        // Guard: avoid overwriting with identical content
        if (isBlocksEqual(document.content, newBlocks)) return;

        try {
          const updatedDoc = await updateDocumentContent(
            fileId,
            {
              category: documentCategory ? documentCategory : null,
              content: newBlocks,
            },
            { commit: false }
          );

          if (updatedDoc) {
            setDocument(updatedDoc);
            if (Array.isArray(updatedDoc.content) && updatedDoc.content.length > 0) {
              setBlocks(updatedDoc.content);
            }
            scheduleIdleCommit(updatedDoc.content || newBlocks);
          }
        } catch (error) {
          logger.error('Failed to save document:', error);
        }
      }
    },
    [fileId, document, documentCategory, scheduleIdleCommit]
  );

  const handleNameChange = useCallback(
    async (newName: string): Promise<void> => {
      setFileName(newName);
      if (document) {
        setDocument({ ...document, name: newName });
      }
      if (fileId) {
        try {
          const renamed = await renameDocument(fileId, newName);
          if (renamed) setDocument(renamed);
        } catch (error) {
          logger.error('Failed to rename file:', error);
        }
      }
    },
    [document, fileId]
  );

  const handleCategoryChange = useCallback(
    async (newCategory: string): Promise<void> => {
      setDocumentCategory(newCategory);
      if (document) {
        setDocument({ ...document, category: newCategory });
      }
      if (fileId && document) {
        try {
          const updated = await updateDocumentContent(fileId, {
            category: newCategory ? newCategory : null,
            content: blocks,
          });
          if (updated) {
            setDocument(updated);
            const fresh = await getDocumentById(fileId, null);
            if (fresh) setDocument(fresh);
          }
        } catch (error) {
          logger.error('Failed to save category:', error);
        }
      }
    },
    [document, fileId, blocks]
  );

  // Flush pending edits when leaving the page
  useEffect(() => {
    return () => {
      if (idleCommitTimer) window.clearTimeout(idleCommitTimer);
      if (fileId && document && !isBlocksEqual(document.content, blocks)) {
        void updateDocumentContent(
          fileId,
          {
            category: documentCategory ? documentCategory : null,
            content: blocks,
          },
          { commit: true }
        );
      }
    };
  }, [fileId, document, blocks, documentCategory, idleCommitTimer]);

  return {
    fileId,
    document,
    blocks,
    fileName,
    documentCategory,
    handleSave,
    handleNameChange,
    handleCategoryChange,
  };
}

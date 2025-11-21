import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { logger } from '@/lib/logger';
import {
  getDocumentById,
  updateDocumentContent,
  renameDocument,
} from '@/lib/shared/services/DocumentService';
import { useAuthStore } from '@/stores/authStore';
import type { DocumentItem } from '@/types/documents';

export function useTipTapEditor(): {
  fileId: string | undefined;
  document: DocumentItem | null;
  contentHtml: string;
  fileName: string;
  documentCategory: string;
  handleSave: (html: string) => Promise<void>;
  handleNameChange: (newName: string) => Promise<void>;
  handleCategoryChange: (newCategory: string) => Promise<void>;
} {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const getCurrentSession = useAuthStore((s) => s.getCurrentSession);

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [contentHtml, setContentHtml] = useState<string>('<p></p>');
  const [fileName, setFileName] = useState('');
  const [documentCategory, setDocumentCategory] = useState<string>('');
  const [idleCommitTimer, setIdleCommitTimer] = useState<number | null>(null);

  const isContentEqual = (a: string | null | undefined, b: string): boolean => {
    const normalizedA = (a || '<p></p>').trim();
    const normalizedB = (b || '<p></p>').trim();
    return normalizedA === normalizedB;
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

      // Prefer HTML content, fallback to converting blocks if needed
      if (doc.contentHtml) {
        setContentHtml(doc.contentHtml);
      } else if (doc.content && doc.content.length > 0) {
        // Convert blocks to HTML (migration path)
        // This will be handled by the TipTapEditor component
        setContentHtml('<p></p>'); // Will be converted by editor
      } else {
        setContentHtml('<p></p>');
      }
    };

    void loadDocument();
  }, [fileId, getCurrentSession, navigate]);

  const scheduleIdleCommit = useCallback(
    (htmlForCommit: string): void => {
      if (idleCommitTimer) {
        window.clearTimeout(idleCommitTimer);
      }
      const tid = window.setTimeout(async () => {
        if (fileId && document && !isContentEqual(document.contentHtml, htmlForCommit)) {
          try {
            const updatedDoc = await updateDocumentContent(
              fileId,
              {
                category: documentCategory ?? null,
                content_html: htmlForCommit,
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
      }, 1000); // 1s idle commit window
      setIdleCommitTimer(tid);
    },
    [idleCommitTimer, fileId, document, documentCategory]
  );

  const handleSave = useCallback(
    async (html: string): Promise<void> => {
      setContentHtml(html);
      if (fileId && document) {
        // Guard: avoid overwriting with identical content
        if (isContentEqual(document.contentHtml, html)) return;

        try {
          const updatedDoc = await updateDocumentContent(
            fileId,
            {
              category: documentCategory ? documentCategory : null,
              content_html: html,
            },
            { commit: false }
          );

          if (updatedDoc) {
            setDocument(updatedDoc);
            if (updatedDoc.contentHtml) {
              setContentHtml(updatedDoc.contentHtml);
            }
            scheduleIdleCommit(updatedDoc.contentHtml || html);
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
            content_html: contentHtml,
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
    [document, fileId, contentHtml]
  );

  // Flush pending edits when leaving the page
  useEffect(() => {
    return () => {
      if (idleCommitTimer) window.clearTimeout(idleCommitTimer);
      if (fileId && document && !isContentEqual(document.contentHtml, contentHtml)) {
        void updateDocumentContent(
          fileId,
          {
            category: documentCategory ? documentCategory : null,
            content_html: contentHtml,
          },
          { commit: true }
        );
      }
    };
  }, [fileId, document, contentHtml, documentCategory, idleCommitTimer]);

  return {
    fileId,
    document,
    contentHtml,
    fileName,
    documentCategory,
    handleSave,
    handleNameChange,
    handleCategoryChange,
  };
}


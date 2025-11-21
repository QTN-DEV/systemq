import { useState, useCallback } from 'react';

import { getDocumentHistory } from '@/lib/shared/services/DocumentService';
import type { EditHistoryEvent } from '@/types/documents';

export function useDocumentHistory(fileId: string | undefined): {
  showHistory: boolean;
  history: EditHistoryEvent[] | null;
  historyError: string | null;
  openHistory: () => Promise<void>;
  closeHistory: () => void;
} {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<EditHistoryEvent[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const openHistory = useCallback(async (): Promise<void> => {
    if (!fileId) return;

    setShowHistory(true);
    setHistoryError(null);
    setHistory(null);

    try {
      const events = await getDocumentHistory(fileId);
      setHistory(events);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        // Hide UI if forbidden
        setShowHistory(false);
        setHistory(null);
      } else {
        setHistory([]);
        setHistoryError('Failed to load edit history');
      }
    }
  }, [fileId]);

  const closeHistory = useCallback(() => {
    setShowHistory(false);
  }, []);

  return {
    showHistory,
    history,
    historyError,
    openHistory,
    closeHistory,
  };
}

import { useCallback, useEffect, useState } from "react";

import { addComment, getComments, getHistory } from "@/lib/shared/services/BlockService";
import type { BlockComment, BlockHistory } from "@/types/block-type";

export function useBlockDetail(blockId: string | null) {
  const [comments, setComments] = useState<BlockComment[]>([]);
  const [history, setHistory] = useState<BlockHistory[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadComments = useCallback(async () => {
    if (!blockId) return;
    setLoadingComments(true);
    try {
      const data = await getComments(blockId);
      setComments(data);
    } finally {
      setLoadingComments(false);
    }
  }, [blockId]);

  const loadHistory = useCallback(async () => {
    if (!blockId) return;
    setLoadingHistory(true);
    try {
      const data = await getHistory(blockId);
      setHistory(data);
    } finally {
      setLoadingHistory(false);
    }
  }, [blockId]);

  useEffect(() => {
    setComments([]);
    setHistory([]);
    void loadComments();
    void loadHistory();
  }, [loadComments, loadHistory]);

  const postComment = useCallback(
    async (content: string) => {
      if (!blockId) return;
      await addComment(blockId, content);
      await loadComments();
    },
    [blockId, loadComments]
  );

  return {
    comments,
    history,
    loadingComments,
    loadingHistory,
    postComment,
    refreshComments: loadComments,
    refreshHistory: loadHistory,
  };
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createDocument,
  deleteDocument,
  renameDocument,
} from "@/lib/shared/services/DocumentService";
import { useAuthStore } from "@/stores/authStore";
import type { DocumentItem } from "@/types/documents";

export function useDocumentsActions(currentFolderId: string | null) {
  const queryClient = useQueryClient();
  const getCurrentSession = useAuthStore((state) => state.getCurrentSession);
  const [error, setError] = useState<string | null>(null);

  // Create Document/Folder
  const createMutation = useMutation({
    mutationFn: async ({
      name,
      type,
    }: {
      name: string;
      type: "file" | "folder";
    }) => {
      const session = getCurrentSession();
      if (!session) throw new Error("Authentication required");
      const authToken = `Bearer ${session.token}`;
      return createDocument(name, type, currentFolderId, authToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents", currentFolderId],
      });
      queryClient.invalidateQueries({
        queryKey: ["document-counts"],
      });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message || "Operation failed. Please try again.");
    },
  });

  // Rename Document/Folder
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await renameDocument(id, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents", currentFolderId],
      });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to rename. Please try again.");
    },
  });

  // Delete Document/Folder
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteDocument(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents", currentFolderId],
      });
      queryClient.invalidateQueries({
        queryKey: ["document-counts"],
      });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to delete. Please try again.");
    },
  });

  // Validation
  const validName = (n: string): boolean => /^[A-Za-z0-9 _.-]+$/.test(n);

  const validateName = (
    name: string,
    currentItems: DocumentItem[],
    excludeId?: string
  ): string | null => {
    if (!name || !validName(name)) {
      return "Invalid name: only letters, numbers, spaces, dot (.), hyphen (-), and underscore (_) are allowed.";
    }

    const siblingNames = new Set(
      currentItems
        .filter((i) => i.id !== excludeId)
        .map((i) => i.name.trim().toLowerCase())
    );

    if (siblingNames.has(name.toLowerCase())) {
      return "Duplicate name: an item with this name already exists in this folder.";
    }

    return null;
  };

  return {
    createMutation,
    renameMutation,
    deleteMutation,
    error,
    setError,
    validateName,
  };
}

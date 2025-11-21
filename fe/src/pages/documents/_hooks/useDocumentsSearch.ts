import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { searchDocuments } from "@/lib/shared/services/DocumentService";
import type { DocumentItem } from "@/types/documents";

export function useDocumentsSearch(): {
  globalQuery: string;
  setGlobalQuery: (query: string) => void;
  globalResults: DocumentItem[];
  globalLoading: boolean;
  globalError: string | null;
} {
  const [globalQuery, setGlobalQuery] = useState("");

  const {
    data: globalResults = [],
    isLoading: globalLoading,
    error: globalError,
  } = useQuery({
    queryKey: ["documents-search", globalQuery],
    queryFn: () => searchDocuments(globalQuery.trim(), undefined, 100, 0),
    enabled: globalQuery.trim().length >= 2,
  });

  return {
    globalQuery,
    setGlobalQuery,
    globalResults,
    globalLoading,
    globalError: globalError ? "Search failed. Please try again." : null,
  };
}

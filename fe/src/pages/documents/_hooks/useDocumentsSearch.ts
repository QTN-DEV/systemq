import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { searchDocuments } from "@/lib/shared/services/DocumentService";

export function useDocumentsSearch() {
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

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getDynamicDashboardFiles } from "@/lib/shared/services/DynamicDashboardService";

import { useStore, useStoreApi } from "./hooks/use-store";

export function DynamicDashboardLoader(): null {
  const store = useStoreApi();
  const userId = useStore((state) => state.userId);
  const { data, isLoading } = useQuery({
    queryKey: ["dynamic-dashboard-files", userId],
    queryFn: async () => getDynamicDashboardFiles(userId),
    enabled: userId.length > 0,
  });

  useEffect(() => {
    store.setState((state) => ({
      ...state,
      isLoading,
    }));
  }, [isLoading, store]);

  useEffect(() => {
    if (data === undefined) {
      return;
    }

    store.setState((state) => ({
      ...state,
      content: data.content,
      version: data.version,
    }));
  }, [data, store, userId]);

  return null;
}

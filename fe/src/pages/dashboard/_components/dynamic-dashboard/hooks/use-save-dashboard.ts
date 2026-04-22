import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import {
  updateDynamicDashboardFiles,
} from "@/lib/shared/services/DynamicDashboardService";

import { useStore, useStoreApi } from "./use-store";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useSaveDashboard() {
  const store = useStoreApi();
  const userId = useStore((state) => state.userId);
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, isError, error } = useMutation({
    mutationFn: ({
      content,
      version,
    }: {
      content: string;
      version: number;
    }) =>
      updateDynamicDashboardFiles(userId, {
        content,
        target_version: version,
      }),

    onSuccess: (data) => {
      // Update the store with the authoritative version returned by the server
      store.setState((state) => ({
        ...state,
        content: data.content,
        version: data.version,
      }));

      // Invalidate the query so a background refetch reflects the new version
      void queryClient.invalidateQueries({
        queryKey: ["dynamic-dashboard-files", userId],
      });
    },
  });

  const save = useCallback(async () => {
    const { content, version } = store.getState();
    await mutateAsync({ content, version });
  }, [mutateAsync, store]);

  return { save, isSaving: isPending, isError, error };
}

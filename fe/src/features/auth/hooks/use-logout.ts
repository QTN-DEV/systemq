import { useMutation, useQueryClient } from "@tanstack/react-query";

import { logoutMutation } from "@/api";
import { logger } from "@/lib/logger";
import { useAuthStore } from "@/stores/authStore";

export function useLogout(): {
  logout: () => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const clearSession = useAuthStore((state) => state.clearSession);
  const getCurrentSession = useAuthStore((state) => state.getCurrentSession);
  const queryClient = useQueryClient();

  const finishLogout = (): void => {
    clearSession();
    queryClient.clear();
    logger.log("Logout successful");
    window.location.href = "/";
  };

  const mutation = useMutation({
    ...logoutMutation(),
    onSuccess: () => {
      finishLogout();
    },
    onError: (error) => {
      logger.error("Logout failed", error);
      finishLogout();
    },
  });

  return {
    logout: () => {
      const session = getCurrentSession();
      if (!session?.token) {
        finishLogout();
        return;
      }

      mutation.mutate({
        headers: {
          authorization: `Bearer ${session.token}`,
        },
      });
    },
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error instanceof Error ? mutation.error : null,
  };
}

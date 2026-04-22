import apiClient from "@/lib/shared/api/client";
import { useAuthStore } from "@/stores/authStore";

// ── Types ──────────────────────────────────────────────────────────────────

export interface DashboardAsset {
  user_id: string;
  content: string;
  version: number;
}

export interface DashboardUpdatePayload {
  content: string;
  target_version: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ensureAuth = () => {
  const session = useAuthStore.getState().getCurrentSession();
  if (session?.token) {
    apiClient.setAuthHeader(session.token);
  }
};

// ── API functions ──────────────────────────────────────────────────────────

/**
 * Fetch the current dashboard asset for a user.
 * If no document exists yet the backend auto-creates one and returns it.
 */
export async function getDynamicDashboardFiles(
  userId: string,
): Promise<DashboardAsset> {
  ensureAuth();
  return apiClient.get<DashboardAsset>(`/dashboard/assets/${userId}`);
}

/**
 * Persist updated dashboard content using Optimistic Concurrency Control.
 * Throws an AxiosError with status 409 if the target_version is stale.
 */
export async function updateDynamicDashboardFiles(
  userId: string,
  payload: DashboardUpdatePayload,
): Promise<DashboardAsset> {
  ensureAuth();
  return apiClient.post<DashboardAsset>(`/dashboard/assets/${userId}`, payload);
}

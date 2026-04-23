import { config } from "@/lib/config";
import apiClient from "@/lib/shared/api/client";
import { useAuthStore } from "@/stores/authStore";
import type { SkillPayload, Workspace, WorkspaceFilesResponse, WorkspaceUploadResponse } from "@/types/workspace";

const ensureAuth = (): void => {
  const session = useAuthStore.getState().getCurrentSession();
  if (session?.token) {
    apiClient.setAuthHeader(session.token);
  }
};

export async function listWorkspaces(): Promise<Workspace[]> {
  ensureAuth();
  return apiClient.get<Workspace[]>("/workspaces/list");
}

export async function createWorkspace(name: string): Promise<Workspace> {
  ensureAuth();
  return apiClient.post<Workspace>("/workspaces/create", { name });
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  ensureAuth();
  await apiClient.delete(`/workspaces/${workspaceId}`);
}

/** `browseIn === null` omits `in` (backend defaults to `data/`). Use `""` for workspace root. */
export async function listWorkspaceFiles(
  workspaceId: string,
  browseIn: string | null,
): Promise<WorkspaceFilesResponse> {
  ensureAuth();
  const params: Record<string, string> = { workspace_id: workspaceId };
  if (browseIn !== null) {
    params.in = browseIn;
  }
  return apiClient.get<WorkspaceFilesResponse>("/workspaces/files", { params });
}

export async function createWorkspacePath(
  workspaceId: string,
  path: string,
  isFolder: boolean,
): Promise<WorkspaceUploadResponse> {
  ensureAuth();
  return apiClient.post<WorkspaceUploadResponse>(
    "/workspaces/files/create",
    { path, is_folder: isFolder },
    { params: { workspace_id: workspaceId } },
  );
}

export async function uploadWorkspaceFile(
  workspaceId: string,
  file: File,
  path?: string | null,
): Promise<WorkspaceUploadResponse> {
  const session = useAuthStore.getState().getCurrentSession();
  if (!session?.token) {
    throw new Error("Not authenticated");
  }
  const q = new URLSearchParams({ workspace_id: workspaceId });
  if (path !== undefined && path !== null && path !== "") {
    q.set("path", path);
  }
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${config.apiBaseUrl}/workspaces/upload?${q.toString()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed (${res.status})`);
  }
  return res.json() as Promise<WorkspaceUploadResponse>;
}

export async function getSkill(workspaceId: string, name: string): Promise<SkillPayload> {
  ensureAuth();
  return apiClient.get<SkillPayload>(`/skills/${encodeURIComponent(name)}`, {
    params: { workspace_id: workspaceId },
  });
}

export async function createSkill(
  workspaceId: string,
  name: string,
  content: string,
): Promise<SkillPayload> {
  ensureAuth();
  return apiClient.post<SkillPayload>("/skills/", {
    workspace_id: workspaceId,
    name,
    content,
  });
}

export async function updateSkill(
  workspaceId: string,
  name: string,
  content: string,
): Promise<SkillPayload> {
  ensureAuth();
  return apiClient.put<SkillPayload>(
    `/skills/${encodeURIComponent(name)}`,
    { content },
    { params: { workspace_id: workspaceId } },
  );
}

export async function deleteSkill(workspaceId: string, name: string): Promise<void> {
  ensureAuth();
  await apiClient.delete(`/skills/${encodeURIComponent(name)}`, {
    params: { workspace_id: workspaceId },
  });
}

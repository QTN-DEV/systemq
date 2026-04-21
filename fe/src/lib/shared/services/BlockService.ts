import apiClient from "@/lib/shared/api/client";
import { useAuthStore } from "@/stores/authStore";
import type {
  Block,
  BlockComment,
  BlockCreatePayload,
  BlockHistory,
  BlockUpdatePayload,
} from "@/types/block-type";

const ensureAuth = () => {
  const session = useAuthStore.getState().getCurrentSession();
  if (session?.token) {
    apiClient.setAuthHeader(session.token);
  }
};

export async function getBlocks(): Promise<Block[]> {
  ensureAuth();
  return apiClient.get<Block[]>("/blocks/");
}

export async function getBlockTree(): Promise<Block[]> {
  ensureAuth();
  return apiClient.get<Block[]>("/blocks/tree");
}

export async function getBlock(id: string): Promise<Block> {
  ensureAuth();
  return apiClient.get<Block>(`/blocks/${id}`);
}

export async function getBlockAncestors(id: string): Promise<Block[]> {
  ensureAuth();
  return apiClient.get<Block[]>(`/blocks/${id}/ancestors`);
}

export async function createBlock(payload: BlockCreatePayload): Promise<Block> {
  ensureAuth();
  return apiClient.post<Block>("/blocks/", payload);
}

export async function updateBlock(id: string, payload: BlockUpdatePayload): Promise<Block> {
  ensureAuth();
  return apiClient.patch<Block>(`/blocks/${id}`, payload);
}

export async function deleteBlock(id: string): Promise<void> {
  ensureAuth();
  await apiClient.delete(`/blocks/${id}`);
}

export async function getComments(blockId: string): Promise<BlockComment[]> {
  ensureAuth();
  return apiClient.get<BlockComment[]>(`/blocks/${blockId}/comments`);
}

export async function addComment(blockId: string, content: string): Promise<BlockComment> {
  ensureAuth();
  return apiClient.post<BlockComment>(`/blocks/${blockId}/comments`, { content });
}

export async function getHistory(blockId: string): Promise<BlockHistory[]> {
  ensureAuth();
  return apiClient.get<BlockHistory[]>(`/blocks/${blockId}/history`);
}

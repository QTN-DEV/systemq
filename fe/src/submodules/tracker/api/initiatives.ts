import apiClient from '@/lib/shared/api/client'
import type { CreateInitiativePayload, TrackerInitiative, UpdateInitiativePayload } from '../types/initiative'

export async function listInitiatives(productId?: string): Promise<TrackerInitiative[]> {
  const params = productId ? `?product_id=${productId}` : ''
  return apiClient.get<TrackerInitiative[]>(`/tracker/initiatives/${params}`)
}

export async function getInitiative(id: string): Promise<TrackerInitiative> {
  return apiClient.get<TrackerInitiative>(`/tracker/initiatives/${id}`)
}

export async function createInitiative(data: CreateInitiativePayload): Promise<TrackerInitiative> {
  return apiClient.post<TrackerInitiative>('/tracker/initiatives/', data)
}

export async function updateInitiative(id: string, data: UpdateInitiativePayload): Promise<TrackerInitiative> {
  return apiClient.patch<TrackerInitiative>(`/tracker/initiatives/${id}`, data)
}

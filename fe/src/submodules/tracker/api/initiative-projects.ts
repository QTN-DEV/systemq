import apiClient from '@/lib/shared/api/client'
import type { CreateInitiativeProjectPayload, InitiativeProject, UpdateInitiativeProjectPayload } from '../types/initiative-project'

export async function listInitiativeProjects(productId?: string): Promise<InitiativeProject[]> {
  const params = productId ? `?product_id=${productId}` : ''
  return apiClient.get<InitiativeProject[]>(`/tracker/initiative-projects/${params}`)
}

export async function getInitiativeProject(id: string): Promise<InitiativeProject> {
  return apiClient.get<InitiativeProject>(`/tracker/initiative-projects/${id}`)
}

export async function createInitiativeProject(data: CreateInitiativeProjectPayload): Promise<InitiativeProject> {
  return apiClient.post<InitiativeProject>('/tracker/initiative-projects/', data)
}

export async function updateInitiativeProject(id: string, data: UpdateInitiativeProjectPayload): Promise<InitiativeProject> {
  return apiClient.patch<InitiativeProject>(`/tracker/initiative-projects/${id}`, data)
}

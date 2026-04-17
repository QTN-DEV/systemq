import apiClient from '@/lib/shared/api/client'
import type { TrackerConfigData } from '../types/config'

export async function getPlanningStatuses(): Promise<TrackerConfigData> {
  return apiClient.get<TrackerConfigData>('/tracker/config/planning-statuses')
}

export async function updatePlanningStatuses(values: string[]): Promise<TrackerConfigData> {
  return apiClient.put<TrackerConfigData>('/tracker/config/planning-statuses', { values })
}

export async function getIssueStatuses(): Promise<TrackerConfigData> {
  return apiClient.get<TrackerConfigData>('/tracker/config/issue-statuses')
}

export async function updateIssueStatuses(values: string[]): Promise<TrackerConfigData> {
  return apiClient.put<TrackerConfigData>('/tracker/config/issue-statuses', { values })
}

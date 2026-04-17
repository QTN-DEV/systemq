import apiClient from '@/lib/shared/api/client'
import type { CreateCommentPayload, IssueComment } from '../types/comment'
import type { CreateIssuePayload, TrackerIssue, UpdateIssuePayload } from '../types/issue'

export interface IssueFilters {
  initiative_project_id?: string
  status?: string
  assignee_id?: string
  priority?: number
}

export async function listIssues(filters: IssueFilters = {}): Promise<TrackerIssue[]> {
  const params = new URLSearchParams()
  if (filters.initiative_project_id) params.set('initiative_project_id', filters.initiative_project_id)
  if (filters.status) params.set('status', filters.status)
  if (filters.assignee_id) params.set('assignee_id', filters.assignee_id)
  if (filters.priority !== undefined) params.set('priority', String(filters.priority))
  const qs = params.toString()
  return apiClient.get<TrackerIssue[]>(`/tracker/issues/${qs ? `?${qs}` : ''}`)
}

export async function getIssue(id: string): Promise<TrackerIssue> {
  return apiClient.get<TrackerIssue>(`/tracker/issues/${id}`)
}

export async function createIssue(data: CreateIssuePayload): Promise<TrackerIssue> {
  return apiClient.post<TrackerIssue>('/tracker/issues/', data)
}

export async function updateIssue(id: string, data: UpdateIssuePayload): Promise<TrackerIssue> {
  return apiClient.patch<TrackerIssue>(`/tracker/issues/${id}`, data)
}

export async function listComments(issueId: string): Promise<IssueComment[]> {
  return apiClient.get<IssueComment[]>(`/tracker/issues/${issueId}/comments`)
}

export async function createComment(issueId: string, data: CreateCommentPayload): Promise<IssueComment> {
  return apiClient.post<IssueComment>(`/tracker/issues/${issueId}/comments`, data)
}

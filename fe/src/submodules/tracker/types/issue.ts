export interface TrackerIssue {
  id: string
  initiative_project_id: string | null
  parent_issue_id: string | null
  title: string
  description: string | null
  status: string
  priority: number
  assignee_id: string | null
  reporter_id: string | null
  triage_owner_id: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
  deleted_at: string | null
}

export interface CreateIssuePayload {
  title: string
  initiative_project_id?: string | null
  parent_issue_id?: string | null
  description?: string | null
  status?: string
  priority?: number
  assignee_id?: string | null
  reporter_id?: string | null
  triage_owner_id?: string | null
}

export interface UpdateIssuePayload {
  title?: string
  initiative_project_id?: string | null
  parent_issue_id?: string | null
  description?: string | null
  status?: string
  priority?: number
  assignee_id?: string | null
  reporter_id?: string | null
  triage_owner_id?: string | null
  deleted_at?: string | null
}

export const PRIORITY_LABELS: Record<number, string> = {
  0: 'Urgent',
  1: 'High',
  2: 'Medium',
  3: 'Low',
  4: 'No Priority',
}

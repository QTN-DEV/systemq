export interface IssueComment {
  id: string
  issue_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateCommentPayload {
  author_id: string
  body: string
}

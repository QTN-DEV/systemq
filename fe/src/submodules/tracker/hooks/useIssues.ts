import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type IssueFilters, createIssue, createComment, getIssue, listComments, listIssues, updateIssue } from '../api/issues'
import type { CreateCommentPayload } from '../types/comment'
import type { CreateIssuePayload, UpdateIssuePayload } from '../types/issue'

export function useIssues(filters: IssueFilters = {}) {
  return useQuery({
    queryKey: ['tracker', 'issues', filters],
    queryFn: () => listIssues(filters),
  })
}

export function useIssue(id: string) {
  return useQuery({ queryKey: ['tracker', 'issues', id], queryFn: () => getIssue(id), enabled: !!id })
}

export function useComments(issueId: string) {
  return useQuery({
    queryKey: ['tracker', 'comments', issueId],
    queryFn: () => listComments(issueId),
    enabled: !!issueId,
  })
}

export function useCreateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIssuePayload) => createIssue(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracker', 'issues'] }),
  })
}

export function useUpdateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIssuePayload }) => updateIssue(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tracker', 'issues'] })
      qc.invalidateQueries({ queryKey: ['tracker', 'issues', id] })
    },
  })
}

export function useCreateComment(issueId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCommentPayload) => createComment(issueId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracker', 'comments', issueId] }),
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getIssueStatuses, getPlanningStatuses, updateIssueStatuses, updatePlanningStatuses } from '../api/config'

export function usePlanningStatuses() {
  return useQuery({ queryKey: ['tracker', 'config', 'planning_status'], queryFn: getPlanningStatuses })
}

export function useIssueStatuses() {
  return useQuery({ queryKey: ['tracker', 'config', 'issue_status'], queryFn: getIssueStatuses })
}

export function useUpdatePlanningStatuses() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: string[]) => updatePlanningStatuses(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracker', 'config', 'planning_status'] }),
  })
}

export function useUpdateIssueStatuses() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: string[]) => updateIssueStatuses(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracker', 'config', 'issue_status'] }),
  })
}

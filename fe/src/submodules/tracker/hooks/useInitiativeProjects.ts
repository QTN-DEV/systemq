import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createInitiativeProject, getInitiativeProject, listInitiativeProjects, updateInitiativeProject } from '../api/initiative-projects'
import type { CreateInitiativeProjectPayload, UpdateInitiativeProjectPayload } from '../types/initiative-project'

export function useInitiativeProjects(productId?: string) {
  return useQuery({
    queryKey: ['tracker', 'initiative-projects', productId ?? 'all'],
    queryFn: () => listInitiativeProjects(productId),
  })
}

export function useInitiativeProject(id: string) {
  return useQuery({ queryKey: ['tracker', 'initiative-projects', id], queryFn: () => getInitiativeProject(id), enabled: !!id })
}

export function useCreateInitiativeProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInitiativeProjectPayload) => createInitiativeProject(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracker', 'initiative-projects'] }),
  })
}

export function useUpdateInitiativeProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInitiativeProjectPayload }) => updateInitiativeProject(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tracker', 'initiative-projects'] })
      qc.invalidateQueries({ queryKey: ['tracker', 'initiative-projects', id] })
    },
  })
}

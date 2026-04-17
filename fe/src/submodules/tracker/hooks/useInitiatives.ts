import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createInitiative, getInitiative, listInitiatives, updateInitiative } from '../api/initiatives'
import type { CreateInitiativePayload, UpdateInitiativePayload } from '../types/initiative'

export function useInitiatives(productId?: string) {
  return useQuery({
    queryKey: ['tracker', 'initiatives', productId ?? 'all'],
    queryFn: () => listInitiatives(productId),
  })
}

export function useInitiative(id: string) {
  return useQuery({ queryKey: ['tracker', 'initiatives', id], queryFn: () => getInitiative(id), enabled: !!id })
}

export function useCreateInitiative() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInitiativePayload) => createInitiative(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracker', 'initiatives'] }),
  })
}

export function useUpdateInitiative() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInitiativePayload }) => updateInitiative(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tracker', 'initiatives'] })
      qc.invalidateQueries({ queryKey: ['tracker', 'initiatives', id] })
    },
  })
}

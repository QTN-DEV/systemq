import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createProduct, getProduct, listProducts, updateProduct } from '../api/products'
import type { CreateProductPayload, UpdateProductPayload } from '../types/product'

export function useProducts() {
  return useQuery({ queryKey: ['tracker', 'products'], queryFn: listProducts })
}

export function useProduct(id: string) {
  return useQuery({ queryKey: ['tracker', 'products', id], queryFn: () => getProduct(id), enabled: !!id })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductPayload) => createProduct(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracker', 'products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductPayload }) => updateProduct(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tracker', 'products'] })
      qc.invalidateQueries({ queryKey: ['tracker', 'products', id] })
    },
  })
}

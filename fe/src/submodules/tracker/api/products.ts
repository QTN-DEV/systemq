import apiClient from '@/lib/shared/api/client'
import type { CreateProductPayload, TrackerProduct, UpdateProductPayload } from '../types/product'

export async function listProducts(): Promise<TrackerProduct[]> {
  return apiClient.get<TrackerProduct[]>('/tracker/products/')
}

export async function getProduct(id: string): Promise<TrackerProduct> {
  return apiClient.get<TrackerProduct>(`/tracker/products/${id}`)
}

export async function createProduct(data: CreateProductPayload): Promise<TrackerProduct> {
  return apiClient.post<TrackerProduct>('/tracker/products/', data)
}

export async function updateProduct(id: string, data: UpdateProductPayload): Promise<TrackerProduct> {
  return apiClient.patch<TrackerProduct>(`/tracker/products/${id}`, data)
}

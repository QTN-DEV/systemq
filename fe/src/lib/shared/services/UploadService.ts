import axios from 'axios'

import { logger } from '@/lib/logger'
import { useAuthStore } from '@/stores/authStore'

const API_BASE_URL = 'https://api.systemq.qtn.ai'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000 // Increased timeout for file uploads
})

// Add authentication interceptor
api.interceptors.request.use((config) => {
  const session = useAuthStore.getState().getCurrentSession()
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`
  }
  return config
})

export interface UploadResponse {
  url: string
  fileName: string
  fileSize: string
}

/**
 * Upload an image file to the server
 * @param file - The image file to upload
 * @returns Promise with upload metadata
 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post<UploadResponse>('/uploads/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response.data
  } catch (error) {
    logger.error('Image upload failed:', error)
    throw new Error('Failed to upload image')
  }
}

/**
 * Upload a file to the server
 * @param file - The file to upload
 * @returns Promise with upload metadata
 */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post<UploadResponse>('/uploads/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response.data
  } catch (error) {
    logger.error('File upload failed:', error)
    throw new Error('Failed to upload file')
  }
}

/**
 * Get the full URL for a file
 * @param relativePath - The relative path returned from upload API
 * @returns Full URL to the file
 */
export function getFileUrl(relativePath: string): string {
  if (relativePath.startsWith('http')) {
    return relativePath
  }
  return `${API_BASE_URL}${relativePath}`
}
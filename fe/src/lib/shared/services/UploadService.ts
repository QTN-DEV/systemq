import { logger } from '@/lib/logger'
import { useAuthStore } from '@/stores/authStore'
import { config } from '@/lib/config'
import apiClient from '@/lib/shared/api/client'

// Helper to ensure auth token is set before API calls
const ensureAuth = () => {
  const session = useAuthStore.getState().getCurrentSession()
  if (session?.token) {
    apiClient.setAuthHeader(session.token)
  }
};

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
  ensureAuth();
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await apiClient.post<UploadResponse>('/uploads/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response
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
  ensureAuth();
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await apiClient.post<UploadResponse>('/uploads/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response
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
  return `${config.apiBaseUrl}${relativePath}`
}
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import apiClient from '@/lib/shared/api/client'
import { useAuthStore } from '@/stores/authStore'

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
 * @param relativePath - The relative path or full URL returned from upload API
 * @returns Full URL to the file using the bucket domain
 */
export function getFileUrl(relativePath: string): string {
  // If already a full URL, normalize it to use the configured bucket domain
  if (relativePath.startsWith('http')) {
    try {
      const url = new URL(relativePath)
      const protocol = config.bucketUseSSL ? 'https' : 'http'
      // If the URL already uses the bucket domain, return as-is
      if (url.hostname === config.bucketDomain) {
        return relativePath
      }
      // Otherwise, normalize to use the bucket domain
      return `${protocol}://${config.bucketDomain}${url.pathname}${url.search}${url.hash}`
    } catch {
      // If URL parsing fails, return as-is
      return relativePath
    }
  }
  // For relative paths, construct URL using bucket domain
  const protocol = config.bucketUseSSL ? 'https' : 'http'
  // Remove leading slash if present to avoid double slashes
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  return `${protocol}://${config.bucketDomain}/${cleanPath}`
}
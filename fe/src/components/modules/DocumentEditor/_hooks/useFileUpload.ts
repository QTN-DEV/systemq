import { useState } from 'react'
import { isAxiosError } from 'axios'
import Swal from 'sweetalert2'
import { logger } from '@/lib/logger'
import { uploadImage, uploadFile, getFileUrl } from '@/lib/shared/services/UploadService'
import type { DocumentBlock } from '@/types/documents'

export const useFileUpload = (
  blocks: DocumentBlock[],
  setBlocks: React.Dispatch<React.SetStateAction<DocumentBlock[]>>,
  readOnly: boolean,
  addBlock: (afterId: string, type?: DocumentBlock['type']) => string,
) => {
  const [uploadingBlocks, setUploadingBlocks] = useState<Set<string>>(new Set())

  const uploadFileToServer = async (
    file: File,
    blockType: 'image' | 'file',
  ): Promise<{ url: string; fileName: string; fileSize: string }> => {
    try {
      const uploadResponse =
        blockType === 'image' ? await uploadImage(file) : await uploadFile(file)
      return {
        url: getFileUrl(uploadResponse.url),
        fileName: uploadResponse.fileName,
        fileSize: uploadResponse.fileSize,
      }
    } catch (error) {
      logger.error('Upload failed:', error)
      throw new Error(`Failed to upload ${blockType}`)
    }
  }

  const handleFileUpload = async (
    blockId: string,
    file: File,
    preferredType?: DocumentBlock['type'],
    cleanupOnFailure = false,
    blocks?: DocumentBlock[],
  ): Promise<void> => {
    if (readOnly) return
    const block = blocks?.find((b) => b.id === blockId)
    const inferredFromBlock =
      block?.type === 'image' ? 'image' : block?.type === 'file' ? 'file' : null
    const uploadType: 'image' | 'file' =
      (preferredType === 'image' || preferredType === 'file')
        ? preferredType
        : inferredFromBlock ?? (file.type.startsWith('image/') ? 'image' : 'file')

    setUploadingBlocks((prev) => new Set(prev).add(blockId))
    try {
      const uploadResult = await uploadFileToServer(file, uploadType)
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? {
              ...b,
              type: uploadType,
              url: uploadResult.url,
              fileName: uploadResult.fileName,
              fileSize: uploadResult.fileSize,
              content: uploadType === 'file'
                ? uploadResult.fileName || file.name || b.content
                : b.content || file.name || '',
            }
            : b,
        ),
      )
    } catch (error) {
      logger.error('Upload failed:', error)
      let message = 'Failed to upload file'
      if (isAxiosError(error)) {
        const status = error.response?.status
        if (status === 413) {
          message = 'File is too large. Maximum allowed size is 50 MB.'
        } else if (typeof error.response?.data?.detail === 'string') {
          message = error.response.data.detail
        }
      }
      void Swal.fire({
        toast: true,
        icon: 'error',
        title: message,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      })
      if (cleanupOnFailure) {
        setBlocks((prev) => prev.filter((b) => b.id !== blockId))
      }
    } finally {
      setUploadingBlocks((prev) => {
        const next = new Set(prev)
        next.delete(blockId)
        return next
      })
    }
  }

  const insertFilesAsBlocks = (anchorId: string, files: FileList | File[]): void => {
    if (readOnly) return
    const validFiles = Array.from(files).filter((file) => file && file.size > 0)
    if (validFiles.length === 0) return

    const anchorBlock = blocks.find((b) => b.id === anchorId)
    let afterId = anchorId

    validFiles.forEach((file, index) => {
      const blockType: DocumentBlock['type'] = file.type.startsWith('image/') ? 'image' : 'file'
      const canReuseAnchor =
        index === 0 &&
        anchorBlock &&
        ((blockType === 'image' && anchorBlock.type === 'image' && !anchorBlock.url) ||
          (blockType === 'file' && anchorBlock.type === 'file' && !anchorBlock.url))

      if (canReuseAnchor) {
        void handleFileUpload(anchorId, file, blockType, false, blocks)
        afterId = anchorId
      } else {
        const newBlockId = addBlock(afterId, blockType)
        afterId = newBlockId
        setTimeout(() => { void handleFileUpload(newBlockId, file, blockType, true, blocks) }, 0)
      }
    })
  }

  return {
    uploadingBlocks,
    handleFileUpload,
    insertFilesAsBlocks,
  }
}

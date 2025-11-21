import { FileText } from 'lucide-react'
import type { ReactElement } from 'react'

import type { DocumentBlock } from '@/types/documents'

interface FileBlockProps {
  block: DocumentBlock
  readOnly: boolean
  uploadingBlocks: Set<string>
  updateBlock: (id: string, updates: Partial<DocumentBlock>) => void
  handleFileUpload: (blockId: string, file: File, blockType?: DocumentBlock['type'], cleanupOnFailure?: boolean) => Promise<void>
}

export const FileBlock = ({
  block,
  readOnly,
  uploadingBlocks,
  updateBlock,
  handleFileUpload,
}: FileBlockProps): ReactElement => {
  const isUploading = uploadingBlocks.has(block.id)
  const hasFile = block.url && block.fileName && !isUploading

  if (hasFile) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <FileText className="w-10 h-10 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">{block.fileName}</h4>
            <p className="text-xs text-gray-500 mt-1">{block.fileSize}</p>
          </div>
          <div className="flex-shrink-0">
            <a
              href={block.url}
              download={block.fileName}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Download
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isUploading ? (
        <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Uploading file...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer bg-gray-50">
            <label className="cursor-pointer text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Click to upload a file</p>
              <p className="text-xs text-gray-500 mt-1">Any file type up to 50MB</p>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFileUpload(block.id, file, block.type, false)
                }}
                disabled={readOnly}
              />
            </label>
          </div>
          <div className="text-center text-sm text-gray-500">or</div>
          <div className="space-y-2">
            <input
              placeholder="File name"
              className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none"
              value={block.fileName ?? block.content}
              onChange={(e) =>
                updateBlock(block.id, {
                  fileName: e.target.value,
                  content: e.target.value,
                })
              }
              disabled={readOnly}
            />
            <input
              type="url"
              placeholder="Paste file URL"
              className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none"
              value={block.url ?? ''}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
              disabled={readOnly}
            />
          </div>
        </div>
      )}
    </div>
  )
}

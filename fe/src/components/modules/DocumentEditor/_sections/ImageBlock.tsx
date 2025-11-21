import { AlignLeft, AlignCenter, AlignRight, Image } from 'lucide-react'
import type { ReactElement } from 'react'

import type { DocumentBlock } from '@/types/documents'

interface ImageBlockProps {
  block: DocumentBlock
  readOnly: boolean
  uploadingBlocks: Set<string>
  hoveredImageId: string | null
  setHoveredImageId: (id: string | null) => void
  updateBlock: (id: string, updates: Partial<DocumentBlock>) => void
  handleFileUpload: (blockId: string, file: File, blockType?: DocumentBlock['type'], cleanupOnFailure?: boolean) => Promise<void>
}

export const ImageBlock = ({
  block,
  readOnly,
  uploadingBlocks,
  hoveredImageId,
  setHoveredImageId,
  updateBlock,
  handleFileUpload,
}: ImageBlockProps): ReactElement => {
  const isUploading = uploadingBlocks.has(block.id)
  const hasImage = block.url && !isUploading

  if (hasImage) {
    const imageAlignment = block.alignment ?? 'center'
    const alignmentClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
    } as const

    return (
      <div className={`flex w-full ${alignmentClasses[imageAlignment]}`}>
        <div
          className="relative group"
          onMouseEnter={() => !readOnly && setHoveredImageId(block.id)}
          onMouseLeave={() => setHoveredImageId(null)}
        >
          <img
            src={block.url}
            alt={block.content || 'Uploaded image'}
            className="max-w-full h-auto rounded-lg shadow-sm"
            style={{ maxHeight: '500px' }}
          />

          {hoveredImageId === block.id && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 -translate-y-2 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <button
                className={`p-2 rounded hover:bg-gray-100 transition-colors ${imageAlignment === 'left' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                onClick={() => updateBlock(block.id, { alignment: 'left' })}
                title="Align left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                className={`p-2 rounded hover:bg-gray-100 transition-colors ${imageAlignment === 'center' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                onClick={() => updateBlock(block.id, { alignment: 'center' })}
                title="Align center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                className={`p-2 rounded hover:bg-gray-100 transition-colors ${imageAlignment === 'right' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                onClick={() => updateBlock(block.id, { alignment: 'right' })}
                title="Align right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          )}
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
            <p className="text-sm text-gray-600">Uploading image...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer bg-gray-50">
            <label className="cursor-pointer text-center">
              <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Click to upload an image</p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
              <input
                type="file"
                accept="image/*"
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
          <input
            type="url"
            placeholder="Paste image URL"
            className="w-full text-sm border border-gray-200 rounded px-3 py-2 text-center outline-none"
            value={block.url ?? ''}
            onChange={(e) => updateBlock(block.id, { url: e.target.value })}
            disabled={readOnly}
          />
        </div>
      )}
    </div>
  )
}

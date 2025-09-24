import { 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3,
  Type,
  Plus,
  GripVertical,
  X,
  Image,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react'
import { useState, useRef, useEffect, type ReactElement } from 'react'

import { logger } from '@/lib/logger'

import { uploadImage, uploadFile, getFileUrl } from '../services/UploadService'

export interface DocumentBlock {
  id: string
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulleted-list' | 'numbered-list' | 'quote' | 'code' | 'image' | 'file'
  content: string
  alignment?: 'left' | 'center' | 'right'
  url?: string // For image src or file download URL
  fileName?: string // For file blocks
  fileSize?: string // For file blocks
}

interface DocumentEditorProps {
  initialBlocks?: DocumentBlock[]
  onSave?: (blocks: DocumentBlock[]) => void
  readOnly?: boolean
  title?: string
  onTitleChange?: (title: string) => void
}

const TypeMenu = ({ 
  blockId, 
  onChangeBlockType 
}: { 
  blockId: string
  onChangeBlockType: (blockId: string, newType: DocumentBlock['type']) => void
}): ReactElement => (
  <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px]">
    <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
      Basic blocks
    </div>
    
    {[
      { type: 'paragraph' as const, icon: Type, label: 'Text' },
      { type: 'heading1' as const, icon: Heading1, label: 'Heading 1' },
      { type: 'heading2' as const, icon: Heading2, label: 'Heading 2' },
      { type: 'heading3' as const, icon: Heading3, label: 'Heading 3' },
      { type: 'bulleted-list' as const, icon: List, label: 'Bulleted list' },
      { type: 'numbered-list' as const, icon: ListOrdered, label: 'Numbered list' },
      { type: 'quote' as const, icon: Quote, label: 'Quote' },
      { type: 'code' as const, icon: Code, label: 'Code' },
      { type: 'image' as const, icon: Image, label: 'Image' },
      { type: 'file' as const, icon: FileText, label: 'File' }
    ].map(({ type, icon: Icon, label }) => (
      <button
        key={type}
        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
        onClick={() => onChangeBlockType(blockId, type)}
      >
        <Icon className="w-5 h-5 text-gray-400" />
        <div>
          <div className="text-sm font-medium text-gray-900">{label}</div>
        </div>
      </button>
    ))}
  </div>
)

function DocumentEditor({ 
  initialBlocks = [], 
  onSave, 
  readOnly = false
}: DocumentEditorProps): ReactElement {
  const [blocks, setBlocks] = useState<DocumentBlock[]>(
    initialBlocks.length > 0 
      ? initialBlocks 
      : [{ id: '1', type: 'paragraph', content: '', alignment: 'left' }]
  )
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [showTypeMenu, setShowTypeMenu] = useState<string | null>(null)
  const [showGripMenu, setShowGripMenu] = useState<string | null>(null)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [uploadingBlocks, setUploadingBlocks] = useState<Set<string>>(new Set())
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)
  const blockRefs = useRef<{ [key: string]: HTMLElement | null }>({})

  // Real upload API function
  const uploadFileToServer = async (file: File, blockType: 'image' | 'file'): Promise<{ url: string; fileName: string; fileSize: string }> => {
    try {
      const uploadResponse = blockType === 'image'
        ? await uploadImage(file)
        : await uploadFile(file)

      return {
        url: getFileUrl(uploadResponse.url),
        fileName: uploadResponse.fileName,
        fileSize: uploadResponse.fileSize
      }
    } catch (error) {
      logger.error('Upload failed:', error)
      throw new Error(`Failed to upload ${blockType}`)
    }
  }

  useEffect((): (() => void) | void => {
    if (onSave) {
      const timeoutId = setTimeout(() => {
        onSave(blocks)
      }, 1000) // Auto-save after 1 second of inactivity

      return () => clearTimeout(timeoutId)
    }
  }, [blocks, onSave])


  const addBlock = (afterId: string, type: DocumentBlock['type'] = 'paragraph'): void => {
    const newBlock: DocumentBlock = {
      id: Date.now().toString(),
      type,
      content: '',
      alignment: 'left'
    }

    const afterIndex = blocks.findIndex(block => block.id === afterId)
    const newBlocks = [
      ...blocks.slice(0, afterIndex + 1),
      newBlock,
      ...blocks.slice(afterIndex + 1)
    ]

    setBlocks(newBlocks)
    setActiveBlockId(newBlock.id)

    // Focus the new block
    setTimeout(() => {
      const element = blockRefs.current[newBlock.id]
      if (element) {
        element.focus()
      }
    }, 0)
  }

  const updateBlock = (id: string, updates: Partial<DocumentBlock>): void => {
    setBlocks(blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ))
  }

  const deleteBlock = (id: string): void => {
    if (blocks.length === 1) return // Don't delete the last block
    
    const blockIndex = blocks.findIndex(block => block.id === id)
    const newBlocks = blocks.filter(block => block.id !== id)
    setBlocks(newBlocks)

    // Focus the previous block or the next one
    const focusIndex = blockIndex > 0 ? blockIndex - 1 : 0
    if (newBlocks[focusIndex]) {
      setActiveBlockId(newBlocks[focusIndex].id)
      setTimeout(() => {
        const element = blockRefs.current[newBlocks[focusIndex].id]
        if (element) {
          element.focus()
        }
      }, 0)
    }
  }

  const moveBlock = (fromId: string, toId: string): void => {
    const fromIndex = blocks.findIndex(block => block.id === fromId)
    const toIndex = blocks.findIndex(block => block.id === toId)
    
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return
    
    const newBlocks = [...blocks]
    const [movedBlock] = newBlocks.splice(fromIndex, 1)
    newBlocks.splice(toIndex, 0, movedBlock)
    
    setBlocks(newBlocks)
  }

  const handleDragStart = (e: React.DragEvent, blockId: string): void => {
    setDraggedBlockId(blockId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', blockId)
  }

  const handleDragOver = (e: React.DragEvent, blockId: string): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedBlockId !== blockId) {
      setDragOverBlockId(blockId)
    }
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    // Only clear drag over if we're actually leaving the block area
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverBlockId(null)
    }
  }

  const handleDrop = (e: React.DragEvent, blockId: string): void => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain')
    
    if (draggedId && draggedId !== blockId) {
      moveBlock(draggedId, blockId)
    }
    
    setDraggedBlockId(null)
    setDragOverBlockId(null)
  }

  const handleDragEnd = (): void => {
    setDraggedBlockId(null)
    setDragOverBlockId(null)
  }

  const handleFileUpload = async (blockId: string, file: File): Promise<void> => {
    if (readOnly) return

    // Determine block type from the block being updated
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    const blockType: 'image' | 'file' = block.type === 'image' ? 'image' : 'file'

    // Add block to uploading set
    setUploadingBlocks(prev => new Set(prev).add(blockId))

    try {
      const uploadResult = await uploadFileToServer(file, blockType)

      // Update block with upload result
      updateBlock(blockId, {
        url: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        content: blockType === 'file' ? uploadResult.fileName : file.name // For file blocks, content is the file name
      })
    } catch (error) {
      logger.error('Upload failed:', error)
      // Handle upload error (could show toast notification)
      // For now, just remove from uploading set
    } finally {
      // Remove block from uploading set
      setUploadingBlocks(prev => {
        const newSet = new Set(prev)
        newSet.delete(blockId)
        return newSet
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, blockId: string): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addBlock(blockId)
    } else if (e.key === 'Backspace') {
      const block = blocks.find(b => b.id === blockId)
      if (block && block.content === '' && blocks.length > 1) {
        e.preventDefault()
        deleteBlock(blockId)
      }
    } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      const block = blocks.find(b => b.id === blockId)
      if (block && block.content === '') {
        e.preventDefault()
        setShowTypeMenu(blockId)
      }
    }
  }

  const changeBlockType = (blockId: string, newType: DocumentBlock['type']): void => {
    updateBlock(blockId, { type: newType })
    setShowTypeMenu(null)
  }

  const getBlockPlaceholder = (type: DocumentBlock['type']): string => {
    switch (type) {
      case 'heading1': return 'Heading 1'
      case 'heading2': return 'Heading 2'
      case 'heading3': return 'Heading 3'
      case 'bulleted-list': return 'Bulleted list'
      case 'numbered-list': return 'Numbered list'
      case 'quote': return 'Quote'
      case 'code': return 'Code block'
      case 'image': return 'Enter image URL or upload an image'
      case 'file': return 'Enter file name or upload a file'
      default: return 'Type \'/\' for commands'
    }
  }

  const getBlockElement = (block: DocumentBlock): ReactElement => {
    const commonProps = {
      ref: (el: HTMLElement | null): void => { blockRefs.current[block.id] = el },
      className: `w-full bg-transparent border-none outline-none resize-none overflow-hidden min-h-[1.5em] ${
        block.alignment === 'center' ? 'text-center' : 
        block.alignment === 'right' ? 'text-right' : 'text-left'
      }`,
      placeholder: getBlockPlaceholder(block.type),
      value: block.content,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => 
        updateBlock(block.id, { content: e.target.value }),
      onFocus: (): void => setActiveBlockId(block.id),
      onKeyDown: (e: React.KeyboardEvent): void => handleKeyDown(e, block.id),
      disabled: readOnly
    }

    switch (block.type) {
      case 'heading1':
        return (
          <input
            {...commonProps}
            className={`${commonProps.className} text-3xl font-bold text-gray-900`}
          />
        )
      case 'heading2':
        return ( 
          <input
            {...commonProps}
            className={`${commonProps.className} text-2xl font-semibold text-gray-900`}
          />
        )
      case 'heading3':
        return (
          <input
            {...commonProps}
            className={`${commonProps.className} text-xl font-medium text-gray-900`}
          />
        )
      case 'quote':
        return (
          <textarea
            {...commonProps}
            className={`${commonProps.className} border-l-4 border-gray-300 pl-4 italic text-gray-700 bg-gray-50`}
            rows={1}
            style={{ resize: 'none' }}
            onInput={(e): void => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${target.scrollHeight}px`
            }}
          />
        )
      case 'code':
        return (
          <textarea
            {...commonProps}
            className={`${commonProps.className} font-mono text-sm bg-gray-100 p-3 rounded`}
            rows={1}
            style={{ resize: 'none' }}
            onInput={(e): void => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${target.scrollHeight}px`
            }}
          />
        )
      case 'bulleted-list':
        return (
          <div className="flex items-start space-x-2">
            <span className="text-gray-500">•</span>
            <textarea
              {...commonProps}
              className={`${commonProps.className} flex-1`}
              rows={1}
              style={{ resize: 'none' }}
              onInput={(e): void => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${target.scrollHeight}px`
              }}
            />
          </div>
        )
      case 'numbered-list': {
        const listIndex = blocks.filter((b, i) => 
          i <= blocks.findIndex(b => b.id === block.id) && b.type === 'numbered-list'
        ).length
        return (
          <div className="flex items-start space-x-2">
            <span className="text-gray-500">{listIndex}.</span>
            <textarea
              {...commonProps}
              className={`${commonProps.className} flex-1`}
              rows={1}
              style={{ resize: 'none' }}
              onInput={(e): void => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${target.scrollHeight}px`
              }}
            />
          </div>
        )
      }
      case 'image': {
        const isUploading = uploadingBlocks.has(block.id)
        const hasImage = block.url && !isUploading
        
        if (hasImage) {
          // Render uploaded image with alignment and hover toolbar
          const imageAlignment = block.alignment ?? 'center'
          const alignmentClasses = {
            left: 'justify-start',
            center: 'justify-center', 
            right: 'justify-end'
          }
          
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
                
                {/* Floating Alignment Toolbar */}
                {hoveredImageId === block.id && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 translate-y-[-8px] bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <button
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                        imageAlignment === 'left' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                      }`}
                      onClick={() => updateBlock(block.id, { alignment: 'left' })}
                      title="Align left"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                        imageAlignment === 'center' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                      }`}
                      onClick={() => updateBlock(block.id, { alignment: 'center' })}
                      title="Align center"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                        imageAlignment === 'right' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                      }`}
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
                        if (file) {
                          handleFileUpload(block.id, file)
                        }
                      }}
                      disabled={readOnly}
                    />
                  </label>
                </div>
                <div className="text-center text-sm text-gray-500">or</div>
                <input
                  {...commonProps}
                  type="url"
                  placeholder="Paste image URL"
                  className={`${commonProps.className} text-sm border border-gray-200 rounded px-3 py-2 text-center`}
                  value={block.url ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    const url = e.target.value
                    updateBlock(block.id, { url })
                  }}
                />
              </div>
            )}
          </div>
        )
      }
      case 'file': {
        const isUploading = uploadingBlocks.has(block.id)
        const hasFile = block.url && block.fileName && !isUploading
        
        if (hasFile) {
          // Render uploaded file as card
          return (
            <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <FileText className="w-10 h-10 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {block.fileName}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {block.fileSize}
                  </p>
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
                        if (file) {
                          handleFileUpload(block.id, file)
                        }
                      }}
                      disabled={readOnly}
                    />
                  </label>
                </div>
                <div className="text-center text-sm text-gray-500">or</div>
                <div className="space-y-2">
                  <input
                    {...commonProps}
                    placeholder="File name"
                    className={`${commonProps.className} text-sm border border-gray-200 rounded px-3 py-2`}
                    value={block.fileName ?? block.content}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      updateBlock(block.id, { 
                        fileName: e.target.value,
                        content: e.target.value 
                      })
                    }}
                  />
                  <input
                    type="url"
                    placeholder="Paste file URL"
                    className={`${commonProps.className} text-sm border border-gray-200 rounded px-3 py-2`}
                    value={block.url ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      const url = e.target.value
                      updateBlock(block.id, { url })
                    }}
                    disabled={readOnly}
                  />
                </div>
              </div>
            )}
          </div>
        )
      }
      default:
        return (
          <textarea
            {...commonProps}
            className={`${commonProps.className} text-gray-900`}
            rows={1}
            style={{ resize: 'none' }}
            onInput={(e): void => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${target.scrollHeight}px`
            }}
          />
        )
    }
  }


  return (
    <div className="w-full">
      {/* Document Blocks */}
      <div className="space-y-2">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`group relative transition-all duration-200 ${
              dragOverBlockId === block.id ? 'border-t-2 border-blue-400' : ''
            } ${
              draggedBlockId === block.id ? 'opacity-50' : ''
            }`}
            onMouseEnter={() => !readOnly && setActiveBlockId(block.id)}
            onDragOver={(e) => handleDragOver(e, block.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, block.id)}
          >
            {/* Block Controls */}
            {!readOnly && activeBlockId === block.id && (
              <div className="absolute -left-14 top-0 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded mb-0.5"
                  onClick={() => addBlock(block.id)}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button 
                    draggable
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setShowGripMenu(showGripMenu === block.id ? null : block.id)
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      setShowGripMenu(showGripMenu === block.id ? null : block.id)
                    }}
                    title="Drag to reorder, right-click to change type"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                  
                  {/* Grip Menu */}
                  {showGripMenu === block.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-5"
                        onClick={() => setShowGripMenu(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowGripMenu(null)
                          }
                        }}
                        role="button"
                        tabIndex={-1}
                        aria-label="Close menu"
                      />
                      <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] z-10">
                        <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Change to
                        </div>
                        
                        {[
                          { type: 'paragraph' as const, icon: Type, label: 'Text'},
                          { type: 'heading1' as const, icon: Heading1, label: 'Heading 1' },
                          { type: 'heading2' as const, icon: Heading2, label: 'Heading 2' },
                          { type: 'heading3' as const, icon: Heading3, label: 'Heading 3' },
                          { type: 'bulleted-list' as const, icon: List, label: 'Bulleted list' },
                          { type: 'numbered-list' as const, icon: ListOrdered, label: 'Numbered list' },
                          { type: 'quote' as const, icon: Quote, label: 'Quote' },
                          { type: 'code' as const, icon: Code, label: 'Code' },
                          { type: 'image' as const, icon: Image, label: 'Image' },
                          { type: 'file' as const, icon: FileText, label: 'File' }
                        ].map(({ type, icon: Icon, label }) => (
                          <button
                            key={type}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                            onClick={() => {
                              changeBlockType(block.id, type)
                              setShowGripMenu(null)
                            }}
                          >
                            <Icon className="w-5 h-5 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{label}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Block Content */}
            <div className="relative">
              {getBlockElement(block)}
              
              {/* Type Menu */}
              {showTypeMenu === block.id && (
                <>
                  <div 
                    className="fixed inset-0 z-5"
                    onClick={() => setShowTypeMenu(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowTypeMenu(null)
                      }
                    }}
                    role="button"
                    tabIndex={-1}
                    aria-label="Close menu"
                  />
                  <TypeMenu blockId={block.id} onChangeBlockType={changeBlockType} />
                </>
              )}
            </div>

            {/* Block Actions */}
            {!readOnly && activeBlockId === block.id && blocks.length > 1 && (
              <div className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  onClick={() => deleteBlock(block.id)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Block at End */}
      {!readOnly && (
        <div className="mt-4">
          <button
            className="flex items-center space-x-2 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => addBlock(blocks[blocks.length - 1].id)}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Click to add a block</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default DocumentEditor

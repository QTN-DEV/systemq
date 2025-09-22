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
  FileText
} from 'lucide-react'
import { useState, useRef, useEffect, type ReactElement } from 'react'

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
      { type: 'paragraph' as const, icon: Type, label: 'Text', description: 'Just start writing with plain text.' },
      { type: 'heading1' as const, icon: Heading1, label: 'Heading 1', description: 'Big section heading.' },
      { type: 'heading2' as const, icon: Heading2, label: 'Heading 2', description: 'Medium section heading.' },
      { type: 'heading3' as const, icon: Heading3, label: 'Heading 3', description: 'Small section heading.' },
      { type: 'bulleted-list' as const, icon: List, label: 'Bulleted list', description: 'Create a simple bulleted list.' },
      { type: 'numbered-list' as const, icon: ListOrdered, label: 'Numbered list', description: 'Create a list with numbering.' },
      { type: 'quote' as const, icon: Quote, label: 'Quote', description: 'Capture a quote.' },
      { type: 'code' as const, icon: Code, label: 'Code', description: 'Capture a code snippet.' },
      { type: 'image' as const, icon: Image, label: 'Image', description: 'Upload or embed an image.' },
      { type: 'file' as const, icon: FileText, label: 'File', description: 'Attach a file or document.' }
    ].map(({ type, icon: Icon, label, description }) => (
      <button
        key={type}
        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
        onClick={() => onChangeBlockType(blockId, type)}
      >
        <Icon className="w-5 h-5 text-gray-400" />
        <div>
          <div className="text-sm font-medium text-gray-900">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
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
  const blockRefs = useRef<{ [key: string]: HTMLElement | null }>({})

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
      case 'image':
        return (
          <div className="space-y-3">
            {block.url && (
              <div className="relative">
                <img 
                  src={block.url} 
                  alt={block.content || 'Uploaded image'} 
                  className="max-w-full h-auto rounded-lg shadow-sm"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            )}
            <div className="space-y-2">
              <input
                {...commonProps}
                type="url"
                placeholder="Enter image URL"
                className={`${commonProps.className} text-sm border border-gray-200 rounded px-3 py-2`}
                value={block.url ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => 
                  updateBlock(block.id, { url: e.target.value })
                }
              />
              <input
                {...commonProps}
                placeholder="Alt text / Caption (optional)"
                className={`${commonProps.className} text-sm`}
                value={block.content}
              />
            </div>
          </div>
        )
      case 'file':
        return (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-gray-500" />
              <div className="flex-1 space-y-2">
                <input
                  {...commonProps}
                  placeholder="File name"
                  className={`${commonProps.className} font-medium text-gray-900 bg-transparent`}
                  value={block.fileName ?? block.content}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    updateBlock(block.id, { 
                      fileName: e.target.value,
                      content: e.target.value 
                    })
                  }}
                />
                <div className="flex space-x-4">
                  <input
                    type="url"
                    placeholder="File URL"
                    className="flex-1 text-xs bg-transparent border border-gray-200 rounded px-2 py-1"
                    value={block.url ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => 
                      updateBlock(block.id, { url: e.target.value })
                    }
                    disabled={readOnly}
                  />
                  <input
                    placeholder="File size (e.g. 2.5 MB)"
                    className="w-24 text-xs bg-transparent border border-gray-200 rounded px-2 py-1"
                    value={block.fileSize ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => 
                      updateBlock(block.id, { fileSize: e.target.value })
                    }
                    disabled={readOnly}
                  />
                </div>
              </div>
            </div>
            {block.url && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <a 
                  href={block.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Download {block.fileName ?? 'file'}
                </a>
              </div>
            )}
          </div>
        )
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
                          { type: 'paragraph' as const, icon: Type, label: 'Text', description: 'Just start writing with plain text.' },
                          { type: 'heading1' as const, icon: Heading1, label: 'Heading 1', description: 'Big section heading.' },
                          { type: 'heading2' as const, icon: Heading2, label: 'Heading 2', description: 'Medium section heading.' },
                          { type: 'heading3' as const, icon: Heading3, label: 'Heading 3', description: 'Small section heading.' },
                          { type: 'bulleted-list' as const, icon: List, label: 'Bulleted list', description: 'Create a simple bulleted list.' },
                          { type: 'numbered-list' as const, icon: ListOrdered, label: 'Numbered list', description: 'Create a list with numbering.' },
                          { type: 'quote' as const, icon: Quote, label: 'Quote', description: 'Capture a quote.' },
                          { type: 'code' as const, icon: Code, label: 'Code', description: 'Capture a code snippet.' },
                          { type: 'image' as const, icon: Image, label: 'Image', description: 'Upload or embed an image.' },
                          { type: 'file' as const, icon: FileText, label: 'File', description: 'Attach a file or document.' }
                        ].map(({ type, icon: Icon, label, description }) => (
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
                              <div className="text-xs text-gray-500">{description}</div>
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

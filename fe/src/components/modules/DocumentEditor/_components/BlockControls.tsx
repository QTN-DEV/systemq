import type { ReactElement } from 'react'
import { Plus, GripVertical, X } from 'lucide-react'
import type { DocumentBlock } from '@/types/documents'

interface BlockControlsProps {
  block: DocumentBlock
  blocks: DocumentBlock[]
  activeBlockId: string | null
  readOnly: boolean
  showGripMenu: string | null
  setShowGripMenu: (id: string | null) => void
  gripMenuRef: React.RefObject<HTMLDivElement>
  gripMenuPlacement: 'bottom' | 'top'
  addBlock: (afterId: string, type?: DocumentBlock['type']) => string
  deleteBlock: (id: string) => void
  handleDragStart: (e: React.DragEvent, blockId: string) => void
  handleDragEnd: () => void
  changeBlockType: (blockId: string, newType: DocumentBlock['type']) => void
  openLinkDialogForSelection: (blockId: string) => void
  GripMenuComponent: ReactElement
}

export const BlockControls = ({
  block,
  blocks,
  activeBlockId,
  readOnly,
  showGripMenu,
  setShowGripMenu,
  addBlock,
  deleteBlock,
  handleDragStart,
  handleDragEnd,
  GripMenuComponent,
}: BlockControlsProps): ReactElement | null => {
  if (readOnly || activeBlockId !== block.id) return null

  return (
    <>
      {/* Left controls */}
      <div className="absolute -left-14 top-0 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded mb-0.5"
          onClick={() => addBlock(block.id)}
          title="Add block"
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
            title="Drag to reorder, click/right-click to change type"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {showGripMenu === block.id && GripMenuComponent}
        </div>
      </div>

      {/* Delete button */}
      {blocks.length > 1 && (
        <div className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            onClick={() => deleteBlock(block.id)}
            title="Delete block"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}

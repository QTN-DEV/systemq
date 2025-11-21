import { useState } from 'react'

export const useDragAndDrop = (
  readOnly: boolean,
  moveBlock: (fromId: string, toId: string) => void,
  insertFilesAsBlocks: (anchorId: string, files: FileList | File[]) => void,
): {
  draggedBlockId: string | null
  dragOverBlockId: string | null
  handleDragStart: (e: React.DragEvent, blockId: string) => void
  handleDragOver: (e: React.DragEvent, blockId: string) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDragEnd: () => void
  handleDrop: (e: React.DragEvent, blockId: string) => void
  resetDrag: () => void
} => {
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, blockId: string): void => {
    setDraggedBlockId(blockId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', blockId)
  }

  const handleDragOver = (e: React.DragEvent, blockId: string): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedBlockId !== blockId) setDragOverBlockId(blockId)
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const { clientX: x, clientY: y } = e
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverBlockId(null)
    }
  }

  const handleDragEnd = (): void => {
    setDraggedBlockId(null)
    setDragOverBlockId(null)
  }

  const handleDrop = (e: React.DragEvent, blockId: string): void => {
    e.preventDefault()
    if (readOnly) {
      setDraggedBlockId(null)
      setDragOverBlockId(null)
      return
    }

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      insertFilesAsBlocks(blockId, e.dataTransfer.files)
      setDraggedBlockId(null)
      setDragOverBlockId(null)
      return
    }

    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId && draggedId !== blockId) moveBlock(draggedId, blockId)
    setDraggedBlockId(null)
    setDragOverBlockId(null)
  }

  const resetDrag = (): void => {
    setDraggedBlockId(null)
    setDragOverBlockId(null)
  }

  return {
    draggedBlockId,
    dragOverBlockId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
    resetDrag,
  }
}

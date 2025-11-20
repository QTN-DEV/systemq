import { type RefObject, type Dispatch, type SetStateAction } from 'react'
import type { DocumentBlock } from '@/types/documents'
import { getSelectionOffsets, setSelectionOffsets } from '../_utils/selection'

interface KeyboardHandlersParams {
  blocks: DocumentBlock[]
  setBlocks: Dispatch<SetStateAction<DocumentBlock[]>>
  setActiveBlockId: (id: string | null) => void
  blockRefs: RefObject<{ [key: string]: HTMLElement | null }>
  addBlock: (afterId: string, type?: DocumentBlock['type']) => string
  deleteBlock: (id: string) => void
  setShowTypeMenu: (id: string | null) => void
  saveSelectionForBlock?: (blockId: string) => void
  savedSelectionRef?: RefObject<{ blockId: string; start: number; end: number; backward: boolean } | null>
  skipNextSelectionRestore?: RefObject<boolean>
}

export const useKeyboardHandlers = ({
  blocks,
  setActiveBlockId,
  blockRefs,
  addBlock,
  deleteBlock,
  setShowTypeMenu,
  skipNextSelectionRestore,
}: KeyboardHandlersParams) => {
  const handleKeyDown = (e: React.KeyboardEvent, blockId: string): void => {
    // Filter out modifier keys and other non-actionable keys
    const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape']
    if (modifierKeys.includes(e.key)) {
      return
    }
    
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        e.preventDefault()
        
        // Get current selection
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return
        
        const range = selection.getRangeAt(0)
        
        // Insert <br> element
        const br = document.createElement('br')
        range.deleteContents()
        range.insertNode(br)
        
        // Move cursor after the <br>
        range.setStartAfter(br)
        range.setEndAfter(br)
        selection.removeAllRanges()
        selection.addRange(range)
        
        // Set flag to skip next selection restoration
        if (skipNextSelectionRestore) {
          skipNextSelectionRestore.current = true
        }
        
        return
      } else {
        e.preventDefault()
        addBlock(blockId)
      }
      return
    } else if (e.key === 'Backspace') {
      const block = blocks.find((b) => b.id === blockId)
      if (!block) {
        return
      }
      
      const host = blockRefs.current?.[blockId] as HTMLElement | null
      const offsets = host ? getSelectionOffsets(host) : null
      const caretAtStart = offsets ? offsets.start === 0 && offsets.end === 0 : false

      if (block.content === '' && blocks.length > 1) {
        e.preventDefault()
        deleteBlock(blockId)
        return
      }

      if (caretAtStart) {
        e.preventDefault()
        return
      }
    } else if (e.key === 'ArrowUp' && !e.shiftKey) {
      const host = blockRefs.current?.[blockId] as HTMLElement | null
      const offsets = host ? getSelectionOffsets(host) : null
      if (!offsets || offsets.start !== 0 || offsets.end !== 0) return
      const currentIndex = blocks.findIndex((b) => b.id === blockId)
      if (currentIndex <= 0) return
      const prevBlock = blocks[currentIndex - 1]
      const prevEl = blockRefs.current?.[prevBlock.id]
      if (!prevEl) return
      e.preventDefault()
      setActiveBlockId(prevBlock.id)
      setTimeout(() => {
        prevEl.focus()
        const length = (prevBlock.content ?? '').length
        if ((prevEl as HTMLElement).isContentEditable) {
          setSelectionOffsets(prevEl as HTMLElement, length, length, false)
        }
      }, 0)
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
      const host = blockRefs.current?.[blockId] as HTMLElement | null
      const offsets = host ? getSelectionOffsets(host) : null
      const textLength = host?.textContent?.length ?? 0
      if (!offsets || offsets.start !== textLength || offsets.end !== textLength) return
      const currentIndex = blocks.findIndex((b) => b.id === blockId)
      if (currentIndex < 0 || currentIndex >= blocks.length - 1) return
      const nextBlock = blocks[currentIndex + 1]
      const nextEl = blockRefs.current?.[nextBlock.id]
      if (!nextEl) return
      e.preventDefault()
      setActiveBlockId(nextBlock.id)
      setTimeout(() => {
        nextEl.focus()
        if ((nextEl as HTMLElement).isContentEditable) {
          setSelectionOffsets(nextEl as HTMLElement, 0, 0, false)
        }
      }, 0)
    } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      const block = blocks.find((b) => b.id === blockId)
      if (block && block.content === '') {
        e.preventDefault()
        setShowTypeMenu(blockId)
      }
    }
  }

  return { handleKeyDown }
}

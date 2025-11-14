import { type RefObject } from 'react'
import type { DocumentBlock } from '@/types/documents'
import { getSelectionOffsets, setSelectionOffsets } from '../_utils/selection'

interface KeyboardHandlersParams {
  blocks: DocumentBlock[]
  setBlocks: (blocks: DocumentBlock[]) => void
  setActiveBlockId: (id: string | null) => void
  blockRefs: RefObject<{ [key: string]: HTMLElement | null }>
  addBlock: (afterId: string, type?: DocumentBlock['type']) => string
  deleteBlock: (id: string) => void
  setShowTypeMenu: (id: string | null) => void
  saveSelectionForBlock?: (blockId: string) => void
}

export const useKeyboardHandlers = ({
  blocks,
  setBlocks,
  setActiveBlockId,
  blockRefs,
  addBlock,
  deleteBlock,
  setShowTypeMenu,
  saveSelectionForBlock,
}: KeyboardHandlersParams) => {
  const handleKeyDown = (e: React.KeyboardEvent, blockId: string): void => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow newline inside current block, then store caret location
        if (saveSelectionForBlock) {
          setTimeout(() => {
            saveSelectionForBlock(blockId)
          }, 0)
        }
        return
      } else {
        e.preventDefault()
        addBlock(blockId)
      }
      return
    } else if (e.key === 'Backspace') {
      const block = blocks.find((b) => b.id === blockId)
      if (!block) return
      const host = blockRefs.current?.[blockId] as HTMLElement | null
      const offsets = host ? getSelectionOffsets(host) : null
      const caretAtStart = offsets ? offsets.start === 0 && offsets.end === 0 : false

      if (block.content === '' && blocks.length > 1) {
        e.preventDefault()
        deleteBlock(blockId)
        return
      }

      if (caretAtStart) {
        const currentIndex = blocks.findIndex((b) => b.id === blockId)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : -1
        if (prevIndex >= 0) {
          const prevBlock = blocks[prevIndex]
          const mergeableTypes: DocumentBlock['type'][] = [
            'paragraph',
            'heading1',
            'heading2',
            'heading3',
            'bulleted-list',
            'numbered-list',
            'quote',
            'code',
          ]
          if (
            mergeableTypes.includes(prevBlock.type) &&
            mergeableTypes.includes(block.type)
          ) {
            e.preventDefault()
            const prevText = prevBlock.content || ''
            const mergedContent = `${prevText}${block.content || ''}`
            const caretPosition = prevText.length
            setBlocks(
              blocks.map((b, i) => {
                if (i === prevIndex) return { ...prevBlock, content: mergedContent }
                if (i === currentIndex) return null
                return b
              }).filter((b): b is DocumentBlock => b !== null)
            )
            setActiveBlockId(prevBlock.id)
            setTimeout(() => {
              const prevEl = blockRefs.current?.[prevBlock.id]
              if (prevEl) {
                prevEl.focus()
                setSelectionOffsets(prevEl, caretPosition, caretPosition, false)
              }
            }, 0)
          }
        }
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

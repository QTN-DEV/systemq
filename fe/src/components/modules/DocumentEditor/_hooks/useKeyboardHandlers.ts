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
  commandMenuOpen?: boolean
  openCommandMenu?: (blockId: string, element: HTMLElement) => void
  closeCommandMenu?: () => void
  navigateCommandMenu?: (direction: 'up' | 'down') => void
  selectCommand?: () => void
  changeBlockType?: (blockId: string, newType: DocumentBlock['type']) => void
}

export const useKeyboardHandlers = ({
  blocks,
  setActiveBlockId,
  blockRefs,
  addBlock,
  deleteBlock,
  setShowTypeMenu: _setShowTypeMenu,
  skipNextSelectionRestore,
  commandMenuOpen = false,
  openCommandMenu: _openCommandMenu,
  closeCommandMenu,
  navigateCommandMenu,
  selectCommand,
  changeBlockType,
}: KeyboardHandlersParams): { handleKeyDown: (e: React.KeyboardEvent, blockId: string) => void } => {
  const handleKeyDown = (e: React.KeyboardEvent, blockId: string): void => {
    // Handle Escape key to close command menu (works even if menu state is stale)
    if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      if (commandMenuOpen) {
        e.preventDefault()
        closeCommandMenu?.()
        return
      }
    }

    // Handle command menu navigation
    if (commandMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        navigateCommandMenu?.('down')
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        navigateCommandMenu?.('up')
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        selectCommand?.()
        return
      }
    }

    // Filter out modifier keys and other non-actionable keys
    const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Tab']
    if (modifierKeys.includes(e.key)) {
      return
    }
    
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        e.preventDefault()
        
        // Get current selection and element
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) {
          return
        }
        
        const range = selection.getRangeAt(0)
        const element = e.currentTarget as HTMLElement

        // Determine if cursor is at the end of the block before inserting
        let insertCount = 1
        // Only count visible text length (not HTML) for a better check
        const plainTextLen = element.innerText.length
        // Use selection focus/anchor comparison for safety
        if (
          selection &&
          selection.rangeCount > 0 &&
          range.endOffset === (range.endContainer.nodeType === Node.TEXT_NODE
            ? range.endContainer.nodeValue?.length ?? 0
            : range.endContainer.childNodes.length) &&
          selection.isCollapsed
        ) {
          // Additionally check if that's the end of the entire content
          // Recompute current offset in the entire element plain text
          let totalOffset = 0
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
          let found = false
          while (walker.nextNode()) {
            if (walker.currentNode === range.endContainer) {
              totalOffset += range.endOffset
              found = true
              break
            } else {
              totalOffset += walker.currentNode.nodeValue?.length ?? 0
            }
          }
          // If cursor is at the very end of text
          if (found && totalOffset === plainTextLen) {
            insertCount = 2
          }
        }

        let lastNewlineNode: Text | null = null
        for (let i = 0; i < insertCount; i++) {
          const newlineNode = document.createTextNode("\n")
          range.deleteContents()
          range.insertNode(newlineNode)
          lastNewlineNode = newlineNode
          // After an insert, move range to collapse after what we just added
          range.setStartAfter(newlineNode)
          range.setEndAfter(newlineNode)
        }

        // Move the selection (the cursor) after the last inserted newline
        if (lastNewlineNode) {
          range.setStartAfter(lastNewlineNode)
          range.setEndAfter(lastNewlineNode)
          selection.removeAllRanges()
          selection.addRange(range)
        }
        
        // Set flag to skip next selection restoration BEFORE dispatching input
        if (skipNextSelectionRestore) {
          skipNextSelectionRestore.current = true
        }
        
        // Immediately trigger input event synchronously to update block content
        // This ensures the state update happens before any React re-render
        
        // Create a proper InputEvent for better browser compatibility
        let inputEvent: Event
        try {
          inputEvent = new InputEvent('input', { 
            bubbles: true, 
            cancelable: true,
            inputType: 'insertLineBreak',
            data: null
          })
        } catch {
          // Fallback for browsers that don't support InputEvent constructor
          inputEvent = new Event('input', { bubbles: true, cancelable: true })
        }
        
        // Dispatch the event synchronously (not in setTimeout)
        // This ensures onInput fires immediately and updates state before React re-renders
        element.dispatchEvent(inputEvent)
        
      } else {
        e.preventDefault()
        addBlock(blockId)
      }
      
    } else if (e.key === 'Backspace') {
      const block = blocks.find((b) => b.id === blockId)
      if (!block) {
        return
      }
      
      const host = blockRefs.current?.[blockId]
      const offsets = host ? getSelectionOffsets(host) : null
      const caretAtStart = offsets ? offsets.start === 0 && offsets.end === 0 : false

      // If block is empty and it's a formatted block (not paragraph), convert to paragraph
      const formattedBlockTypes: DocumentBlock['type'][] = [
        'heading1',
        'heading2',
        'heading3',
        'bulleted-list',
        'numbered-list',
        'quote',
        'code',
      ]
      
      if (block.content === '' && formattedBlockTypes.includes(block.type) && changeBlockType) {
        e.preventDefault()
        changeBlockType(blockId, 'paragraph')
        return
      }

      if (block.content === '' && blocks.length > 1) {
        e.preventDefault()
        deleteBlock(blockId)
        return
      }

      if (caretAtStart) {
        e.preventDefault()
        
      }
    } else if (e.key === 'ArrowUp' && !e.shiftKey) {
      const host = blockRefs.current?.[blockId]
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
        if ((prevEl).isContentEditable) {
          setSelectionOffsets(prevEl, length, length, false)
        }
      }, 0)
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
      const host = blockRefs.current?.[blockId]
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
        if ((nextEl).isContentEditable) {
          setSelectionOffsets(nextEl, 0, 0, false)
        }
      }, 0)
    }
  }

  return { handleKeyDown }
}

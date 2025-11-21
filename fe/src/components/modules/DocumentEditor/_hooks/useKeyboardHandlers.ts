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
        // eslint-disable-next-line no-console
        console.log('[Shift+Enter] KeyDown event fired', { blockId })
        e.preventDefault()
        
        // Get current selection and element
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) {
          // eslint-disable-next-line no-console
          console.log('[Shift+Enter] No selection found')
          return
        }
        
        const range = selection.getRangeAt(0)
        const element = e.currentTarget as HTMLElement
        
        // eslint-disable-next-line no-console
        console.log('[Shift+Enter] Before insert - element.innerHTML:', element.innerHTML.substring(0, 100))

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
          let walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
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

        // eslint-disable-next-line no-console
        console.log('[Shift+Enter] After insert - element.innerHTML:', element.innerHTML.substring(0, 100))
        
        // Get the updated HTML immediately after inserting newline
        const updatedHtml = element.innerHTML
        
        // Set flag to skip next selection restoration BEFORE dispatching input
        if (skipNextSelectionRestore) {
          skipNextSelectionRestore.current = true
          // eslint-disable-next-line no-console
          console.log('[Shift+Enter] Set skipNextSelectionRestore to true')
        }
        
        // Immediately trigger input event synchronously to update block content
        // This ensures the state update happens before any React re-render
        // eslint-disable-next-line no-console
        console.log('[Shift+Enter] Dispatching input event - element.innerHTML:', updatedHtml.substring(0, 100))
        
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
        // eslint-disable-next-line no-console
        console.log('[Shift+Enter] Input event dispatched')
        
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

import { useState, useRef, useCallback, type RefObject } from 'react'
import type { DocumentBlock } from '@/types/documents'
import { COMMAND_OPTIONS, type CommandOption } from '../_constants/commandOptions'

interface CommandMenuState {
  isOpen: boolean
  blockId: string | null
  query: string
  position: { x: number; y: number }
  selectedIndex: number
}

interface UseCommandMenuParams {
  readOnly: boolean
  blockRefs: RefObject<{ [key: string]: HTMLElement | null }>
  changeBlockType: (blockId: string, newType: DocumentBlock['type'], options?: { rows?: number; columns?: number }) => void
  setShowLinkDialog: (show: boolean) => void
  setLinkDialogBlockId: (id: string | null) => void
  setLinkDialogText: (text: string) => void
  setLinkDialogUrl: (url: string) => void
  updateBlock: (id: string, updates: Partial<DocumentBlock>) => void
}

export const useCommandMenu = ({
  readOnly,
  blockRefs,
  changeBlockType,
  setShowLinkDialog,
  setLinkDialogBlockId,
  setLinkDialogText,
  setLinkDialogUrl,
  updateBlock,
}: UseCommandMenuParams) => {
  const [commandMenu, setCommandMenu] = useState<CommandMenuState>({
    isOpen: false,
    blockId: null,
    query: '',
    position: { x: 0, y: 0 },
    selectedIndex: 0,
  })

  const commandQueryRef = useRef<string>('')
  const commandStartOffsetRef = useRef<number>(0)

  const openCommandMenu = useCallback((blockId: string, element: HTMLElement) => {
    if (readOnly) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    let rect = range.getBoundingClientRect()
    
    // If the rect is invalid (empty block, no text), use element's position
    if (rect.width === 0 && rect.height === 0) {
      const elementRect = element.getBoundingClientRect()
      // Use element's top-left corner plus a small offset for empty blocks
      rect = {
        left: elementRect.left,
        top: elementRect.top,
        right: elementRect.right,
        bottom: elementRect.top + 20, // Approximate line height
        width: elementRect.width,
        height: 20,
        x: elementRect.x,
        y: elementRect.y,
        toJSON: elementRect.toJSON,
      } as DOMRect
    }
    
    // Get the caret position, ensuring it's valid
    let caretX = rect.left
    let caretY = rect.bottom
    
    // Fallback: if position is still invalid, use element position
    if (caretX <= 0 && caretY <= 0) {
      const elementRect = element.getBoundingClientRect()
      caretX = elementRect.left
      caretY = elementRect.top + 20
    }

    // Save the position where the command started
    const offsets = getTextOffset(element, range.startContainer, range.startOffset)
    commandStartOffsetRef.current = offsets

    setCommandMenu({
      isOpen: true,
      blockId,
      query: '',
      position: { x: caretX, y: caretY + 4 },
      selectedIndex: 0,
    })
    commandQueryRef.current = ''
  }, [readOnly])

  const closeCommandMenu = useCallback(() => {
    setCommandMenu((prev) => ({
      ...prev,
      isOpen: false,
      blockId: null,
      query: '',
      selectedIndex: 0,
    }))
    commandQueryRef.current = ''
    commandStartOffsetRef.current = 0
  }, [])

  const updateCommandQuery = useCallback((_blockId: string, query: string) => {
    setCommandMenu((prev) => {
      // If query is empty and menu is open, close it
      if (!query && prev.isOpen) {
        return {
          ...prev,
          isOpen: false,
          blockId: null,
          query: '',
          selectedIndex: 0,
        }
      }
      return {
        ...prev,
        query,
        selectedIndex: 0, // Reset selection when query changes
      }
    })
    commandQueryRef.current = query
  }, [])

  const selectCommand = useCallback((option: CommandOption) => {
    if (!commandMenu.blockId) return

    const blockId = commandMenu.blockId
    const element = blockRefs.current?.[blockId]
    if (!element) return

    // Remove the command text (everything from '/' onwards)
    const textContent = element.innerText || ''
    const commandStart = textContent.lastIndexOf('/')
    
    if (commandStart !== -1) {
      // Get text before the command
      const beforeCommand = textContent.substring(0, commandStart)
      
      // Update block content
      if (option.type === 'link') {
        // For link, open the dialog
        updateBlock(blockId, { content: beforeCommand })
        setShowLinkDialog(true)
        setLinkDialogBlockId(blockId)
        setLinkDialogText('')
        setLinkDialogUrl('')
      } else if (option.type === 'table') {
        // Check if query contains dimensions like "table 3x4"
        const tableMatch = commandQueryRef.current.match(/table\s+(\d+)\s*[x×]\s*(\d+)/i)
        const rows = tableMatch ? Math.max(parseInt(tableMatch[1], 10) || 0, 1) : 3
        const columns = tableMatch ? Math.max(parseInt(tableMatch[2], 10) || 0, 1) : 3
        
        // Update content first, then change type
        updateBlock(blockId, { content: beforeCommand })
        changeBlockType(blockId, 'table', { rows, columns })
      } else {
        // For other block types, update content and change type
        updateBlock(blockId, { content: beforeCommand })
        changeBlockType(blockId, option.type)
      }
    } else {
      // If no '/' found, just change the type (for empty blocks)
      if (option.type === 'link') {
        setShowLinkDialog(true)
        setLinkDialogBlockId(blockId)
        setLinkDialogText('')
        setLinkDialogUrl('')
      } else if (option.type === 'table') {
        changeBlockType(blockId, 'table')
      } else {
        changeBlockType(blockId, option.type)
      }
    }

    closeCommandMenu()
  }, [commandMenu.blockId, blockRefs, changeBlockType, setShowLinkDialog, setLinkDialogBlockId, setLinkDialogText, setLinkDialogUrl, updateBlock, closeCommandMenu])

  const selectCommandByIndex = useCallback(() => {
    if (!commandMenu.blockId) return

    // Get filtered options based on current query
    const filteredOptions = COMMAND_OPTIONS.filter((option: CommandOption) => {
      if (!commandMenu.query.trim()) return true
      const queryLower = commandMenu.query.toLowerCase()
      return option.keywords.some((keyword: string) => keyword.includes(queryLower))
    })

    // Get the selected option
    const safeIndex = Math.min(commandMenu.selectedIndex, Math.max(0, filteredOptions.length - 1))
    const option = filteredOptions[safeIndex]
    if (!option) return

    selectCommand(option)
  }, [commandMenu.blockId, commandMenu.query, commandMenu.selectedIndex, selectCommand])

  const navigateCommandMenu = useCallback((direction: 'up' | 'down') => {
    setCommandMenu((prev) => {
      if (!prev.isOpen) return prev
      
      // We'll calculate the actual filtered count in the component
      // For now, use a reasonable max and clamp in the component
      const maxIndex = 20 // Safe upper bound
      const newIndex = direction === 'down'
        ? Math.min(prev.selectedIndex + 1, maxIndex - 1)
        : Math.max(prev.selectedIndex - 1, 0)
      
      return {
        ...prev,
        selectedIndex: newIndex,
      }
    })
  }, [])

  return {
    commandMenu,
    openCommandMenu,
    closeCommandMenu,
    updateCommandQuery,
    selectCommand,
    selectCommandByIndex,
    navigateCommandMenu,
  }
}

// Helper function to get text offset from a node
function getTextOffset(element: HTMLElement, node: Node, offset: number): number {
  let textOffset = 0
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
  )

  let currentNode: Node | null
  while ((currentNode = walker.nextNode())) {
    if (currentNode === node) {
      return textOffset + offset
    }
    textOffset += currentNode.textContent?.length || 0
  }

  return textOffset
}


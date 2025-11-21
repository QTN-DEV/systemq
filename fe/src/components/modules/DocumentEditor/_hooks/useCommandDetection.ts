import type { DocumentBlock } from '@/types/documents'

interface CommandDetectionParams {
  readOnly: boolean
  setShowLinkDialog: (show: boolean) => void
  setLinkDialogBlockId: (id: string | null) => void
  setLinkDialogText: (text: string) => void
  setLinkDialogUrl: (url: string) => void
  updateBlock: (id: string, updates: Partial<DocumentBlock>) => void
  changeBlockType: (blockId: string, newType: DocumentBlock['type'], options?: { rows?: number; columns?: number }) => void
  updateCommandQuery?: (blockId: string, query: string) => void
  closeCommandMenu?: () => void
  commandMenuOpen?: boolean
  getBlockContent?: (blockId: string) => string
}

export const useCommandDetection = ({
  readOnly,
  setShowLinkDialog,
  setLinkDialogBlockId,
  setLinkDialogText,
  setLinkDialogUrl,
  updateBlock,
  changeBlockType,
  updateCommandQuery,
  closeCommandMenu,
  commandMenuOpen = false,
  getBlockContent,
}: CommandDetectionParams): { handleCommandDetection: (blockId: string, html: string) => void } => {
  const handleCommandDetection = (blockId: string, html: string): void => {
    if (readOnly) return
    const text = html.replace(/<[^>]*>/g, '').trim()
    
    // SIMPLIFIED: Command mode only works on empty blocks
    // Get the stored block content (before this input) to check if block was empty
    const previousContent = getBlockContent ? getBlockContent(blockId) : ''
    const wasEmpty = !previousContent || previousContent.trim() === ''
    
    // Only process commands if block was empty and text starts with '/'
    const commandMatch = wasEmpty && text.match(/^\/([^\s\n]*)$/)
    
    if (commandMatch && updateCommandQuery) {
      const query = commandMatch[1] // Text after '/'
      updateCommandQuery(blockId, query)
      return // Don't execute commands while menu is open, let user select
    }
    
    // If menu was open but block is no longer empty or '/' is removed, close it
    if (commandMenuOpen && (!wasEmpty || !text.startsWith('/'))) {
      if (updateCommandQuery) {
        updateCommandQuery(blockId, '')
      } else if (closeCommandMenu) {
        closeCommandMenu()
      }
      return // Don't process legacy commands if menu was just closed
    }
    
    // Legacy command detection (for backward compatibility)
    if (text.toLowerCase().startsWith('/link')) {
      setShowLinkDialog(true)
      setLinkDialogBlockId(blockId)
      setLinkDialogText('')
      setLinkDialogUrl('')
      updateBlock(blockId, { content: '' })
    }
    
    const tableMatch = text.match(/^\/table(?:\s+(\d+)\s*[x×]\s*(\d+))?$/i)
    if (tableMatch) {
      const [, rowsStr, colsStr] = tableMatch
      const rows = rowsStr ? Math.max(parseInt(rowsStr, 10) || 0, 1) : 3
      const columns = colsStr ? Math.max(parseInt(colsStr, 10) || 0, 1) : 3
      changeBlockType(blockId, 'table', { rows, columns })
    }
  }

  return { handleCommandDetection }
}

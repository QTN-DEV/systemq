import type { DocumentBlock } from '@/types/documents'

interface CommandDetectionParams {
  readOnly: boolean
  setShowLinkDialog: (show: boolean) => void
  setLinkDialogBlockId: (id: string | null) => void
  setLinkDialogText: (text: string) => void
  setLinkDialogUrl: (url: string) => void
  updateBlock: (id: string, updates: Partial<DocumentBlock>) => void
  changeBlockType: (blockId: string, newType: DocumentBlock['type'], options?: { rows?: number; columns?: number }) => void
  openCommandMenu?: (blockId: string, element: HTMLElement) => void
  updateCommandQuery?: (blockId: string, query: string) => void
  closeCommandMenu?: () => void
  commandMenuOpen?: boolean
  getBlockContent?: (blockId: string) => string
  blockRefs?: React.RefObject<{ [key: string]: HTMLElement | null }>
}

export const useCommandDetection = ({
  readOnly,
  setShowLinkDialog: _setShowLinkDialog,
  setLinkDialogBlockId: _setLinkDialogBlockId,
  setLinkDialogText: _setLinkDialogText,
  setLinkDialogUrl: _setLinkDialogUrl,
  updateBlock: _updateBlock,
  changeBlockType: _changeBlockType,
  openCommandMenu,
  updateCommandQuery,
  closeCommandMenu,
  commandMenuOpen = false,
  getBlockContent: _getBlockContent,
  blockRefs,
}: CommandDetectionParams): { handleCommandDetection: (blockId: string, html: string) => void } => {
  const handleCommandDetection = (blockId: string, html: string): void => {
    if (readOnly) return

    // Check if text starts with "/" - if the block only contains "/" or "/something",
    // it means the user typed "/" in an empty block
    const commandMatch = html === '/' && html.split(' ').length === 1
    
    if (commandMatch) {
      const query = html.slice(1) // Text after '/'
      
      // Open the command menu if not already open
      if (!commandMenuOpen && openCommandMenu && blockRefs) {
        const element = blockRefs.current?.[blockId]
        if (element) {
          openCommandMenu(blockId, element)
        }
      }
      
      // Update query as user types
      if (updateCommandQuery) {
        updateCommandQuery(blockId, query)
      }
      return // Don't execute commands while menu is open, let user select
    }
    
    // If menu was open but text no longer starts with '/', close it
    if (commandMenuOpen && !html.startsWith('/')) {
      if (closeCommandMenu) {
        closeCommandMenu()
      }
    }
  }

  return { handleCommandDetection }
}

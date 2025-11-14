import type { DocumentBlock } from '@/types/documents'

interface CommandDetectionParams {
  readOnly: boolean
  setShowLinkDialog: (show: boolean) => void
  setLinkDialogBlockId: (id: string | null) => void
  setLinkDialogText: (text: string) => void
  setLinkDialogUrl: (url: string) => void
  updateBlock: (id: string, updates: Partial<DocumentBlock>) => void
  changeBlockType: (blockId: string, newType: DocumentBlock['type'], options?: { rows?: number; columns?: number }) => void
}

export const useCommandDetection = ({
  readOnly,
  setShowLinkDialog,
  setLinkDialogBlockId,
  setLinkDialogText,
  setLinkDialogUrl,
  updateBlock,
  changeBlockType,
}: CommandDetectionParams) => {
  const handleCommandDetection = (blockId: string, html: string): void => {
    if (readOnly) return
    const text = html.replace(/<[^>]*>/g, '').trim()
    
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

import { useState, useEffect } from 'react'
import type { ToolbarPosition, FormatState } from '../_types'

export const useTextFormatting = (
  readOnly: boolean,
  blockRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>,
  updateBlock: (id: string, updates: any) => void,
) => {
  const [showTextToolbar, setShowTextToolbar] = useState(false)
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition>({ x: 0, y: 0 })
  const [toolbarBlockId, setToolbarBlockId] = useState<string | null>(null)
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
  })

  useEffect(() => {
    if (readOnly) return

    const onSelectionChange = (): void => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setShowTextToolbar(false)
        setToolbarBlockId(null)
        return
      }
      const range = sel.getRangeAt(0)
      const containerEl =
        range.commonAncestorContainer instanceof Element
          ? (range.commonAncestorContainer as Element)
          : range.commonAncestorContainer.parentElement
      if (!containerEl) return
      const host = containerEl.closest('.ce-editable') as HTMLElement | null
      if (!host) {
        setShowTextToolbar(false)
        setToolbarBlockId(null)
        return
      }
      const blockId =
        Object.keys(blockRefs.current).find((k) => blockRefs.current[k] === host) || null
      if (!blockId) {
        setShowTextToolbar(false)
        setToolbarBlockId(null)
        return
      }
      let rect = range.getBoundingClientRect()
      if (
        (!rect || (rect.width === 0 && rect.height === 0)) &&
        typeof range.getClientRects === 'function'
      ) {
        const rects = range.getClientRects()
        if (rects && rects.length > 0) rect = rects[0]
      }
      const x = rect.left + rect.width / 2
      const y = rect.top - 8
      setToolbarPos({ x, y })
      setToolbarBlockId(blockId)
      setShowTextToolbar(true)
      try {
        setFormatState({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
        })
      } catch {}
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [readOnly, blockRefs])

  const handleFormat = (command: 'bold' | 'italic' | 'underline'): void => {
    try {
      document.execCommand(command)
    } catch {}
    if (toolbarBlockId) {
      const el = blockRefs.current[toolbarBlockId]
      if (el) updateBlock(toolbarBlockId, { content: (el as HTMLElement).innerHTML })
      try {
        setFormatState({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
        })
      } catch {}
    }
  }

  return {
    showTextToolbar,
    setShowTextToolbar,
    toolbarPos,
    toolbarBlockId,
    formatState,
    handleFormat,
  }
}

import { useState, useRef, useEffect } from 'react'

import type { DocumentBlock } from '@/types/documents'

import type { ToolbarPosition, SavedSelection } from '../_types'
import {
  buildRangeWithin,
  isSelectionInside,
  createAnchorHTML,
  normalizeAnchors,
  replaceRangeWithAnchor,
} from '../_utils'

export const useLinkManagement = (
  readOnly: boolean,
  blockRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>,
  savedSelectionRef: React.MutableRefObject<SavedSelection | null>,
  updateBlock: (id: string, updates: Partial<DocumentBlock>) => void,
) => {
  // Link dialog state
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkDialogText, setLinkDialogText] = useState('')
  const [linkDialogUrl, setLinkDialogUrl] = useState('')
  const [linkDialogBlockId, setLinkDialogBlockId] = useState<string | null>(null)
  const [linkEditAnchor, setLinkEditAnchor] = useState<HTMLAnchorElement | null>(null)

  // Link toolbar state
  const [showLinkToolbar, setShowLinkToolbar] = useState(false)
  const [linkToolbarPos, setLinkToolbarPos] = useState<ToolbarPosition>({ x: 0, y: 0 })
  const [linkToolbarBlockId, setLinkToolbarBlockId] = useState<string | null>(null)
  const linkToolbarRef = useRef<HTMLDivElement | null>(null)

  const openLinkDialogForSelection = (blockId: string): void => {
    setLinkEditAnchor(null)
    setShowLinkToolbar(false)
    const host = blockRefs.current[blockId]
    if (!host) return
    const sel = window.getSelection()
    const inside = sel && sel.rangeCount > 0 ? isSelectionInside(host) : false
    if (inside && sel && !sel.isCollapsed) {
      const selectedText = sel.toString()
      setShowLinkDialog(true)
      setLinkDialogBlockId(blockId)
      setLinkDialogText(selectedText)
      setLinkDialogUrl('')
      return
    }
    const textLen = (host.innerText || '').length
    savedSelectionRef.current = { blockId, start: textLen, end: textLen, backward: false }
    setShowLinkDialog(true)
    setLinkDialogBlockId(blockId)
    setLinkDialogText('')
    setLinkDialogUrl('')
  }

  const applyLinkFromDialog = (): void => {
    if (!linkDialogBlockId) {
      setShowLinkDialog(false)
      return
    }
    const blockId = linkDialogBlockId
    const el = blockRefs.current[blockId]
    if (!el) {
      setShowLinkDialog(false)
      return
    }

    const text = linkDialogText.trim() || linkDialogUrl.trim()
    const href = linkDialogUrl.trim()
    if (!href) {
      setShowLinkDialog(false)
      return
    }

    // Edit existing anchor
    if (linkEditAnchor && el.contains(linkEditAnchor)) {
      linkEditAnchor.setAttribute('href', href)
      linkEditAnchor.setAttribute('target', '_blank')
      linkEditAnchor.setAttribute('rel', 'noopener noreferrer')
      linkEditAnchor.setAttribute('contenteditable', 'false')
      linkEditAnchor.classList.add('inline-editor-link')
      linkEditAnchor.setAttribute('data-inline-link', '1')
      if (text) linkEditAnchor.textContent = text
      updateBlock(blockId, { content: (el).innerHTML })
      setLinkEditAnchor(null)
      setShowLinkDialog(false)
      return
    }

    const saved = savedSelectionRef.current
    let start = (el).innerText.length
    let end = start
    if (saved && saved.blockId === blockId) {
      start = saved.start
      end = saved.end
    }
    try {
      const range = buildRangeWithin(el, start, end)
      replaceRangeWithAnchor(range, href, text)
    } catch {
      ;(el).insertAdjacentHTML('beforeend', createAnchorHTML(href, text))
    }
    normalizeAnchors(el)
    updateBlock(blockId, { type: 'paragraph', content: (el).innerHTML })
    setShowLinkDialog(false)
  }

  const unlinkAnchor = (): void => {
    if (!linkToolbarBlockId || !linkEditAnchor) {
      setShowLinkToolbar(false)
      return
    }
    const blockId = linkToolbarBlockId
    const el = blockRefs.current[blockId]
    if (!el) {
      setShowLinkToolbar(false)
      return
    }
    const text = linkEditAnchor.textContent || ''
    const span = document.createElement('span')
    span.textContent = text
    linkEditAnchor.replaceWith(span)
    updateBlock(blockId, { content: (el).innerHTML })
    setShowLinkToolbar(false)
    setLinkEditAnchor(null)
  }

  const openLinkEditDialog = (): void => {
    if (!linkToolbarBlockId || !linkEditAnchor) return
    setShowLinkToolbar(false)
    setShowLinkDialog(true)
    setLinkDialogBlockId(linkToolbarBlockId)
    setLinkDialogText(linkEditAnchor.textContent || '')
    setLinkDialogUrl(linkEditAnchor.getAttribute('href') || '')
  }

  const closeLinkDialog = (): void => {
    setShowLinkDialog(false)
    setLinkEditAnchor(null)
  }

  // Link hover toolbar
  useEffect(() => {
    if (readOnly) return
    const onMouseOver = (e: MouseEvent): void => {
      const t = e.target as HTMLElement
      const anchor = t?.closest('a')
      if (!anchor) return
      const host = anchor.closest('.ce-editable')
      if (!host) return
      const blockId =
        Object.keys(blockRefs.current).find((k) => blockRefs.current[k] === host) || null
      if (!blockId) return
      const rect = anchor.getBoundingClientRect()
      setLinkToolbarPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 })
      setLinkToolbarBlockId(blockId)
      setShowLinkToolbar(true)
      setLinkEditAnchor(anchor)
    }
    const onMouseDown = (e: MouseEvent): void => {
      const t = e.target as Node
      if (linkToolbarRef.current && linkToolbarRef.current.contains(t)) return
      const isAnchor = (t as HTMLElement).closest && (t as HTMLElement).closest('a')
      if (isAnchor) return
      setShowLinkToolbar(false)
    }
    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [readOnly, blockRefs])

  return {
    // Dialog state
    showLinkDialog,
    setShowLinkDialog,
    linkDialogText,
    setLinkDialogText,
    linkDialogUrl,
    setLinkDialogUrl,
    linkDialogBlockId,
    setLinkDialogBlockId,
    
    // Toolbar state
    showLinkToolbar,
    linkToolbarPos,
    linkToolbarBlockId,
    linkToolbarRef,
    
    // Actions
    openLinkDialogForSelection,
    applyLinkFromDialog,
    unlinkAnchor,
    openLinkEditDialog,
    closeLinkDialog,
  }
}

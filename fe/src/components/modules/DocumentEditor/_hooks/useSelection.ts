import { useRef, useLayoutEffect, useEffect } from 'react'
import type { SavedSelection, BlockRefs } from '../_types'
import { getSelectionOffsets } from '../_utils'
import type { DocumentBlock } from '@/types/documents'

export const useSelection = (blocks: DocumentBlock[]) => {
  const savedSelectionRef = useRef<SavedSelection | null>(null)
  const isSelectingRef = useRef(false)

  const saveSelectionForBlock = (
    blockId: string,
    blockRefs: BlockRefs,
    context?: {
      element?: HTMLElement
      offsets?: { start: number; end: number; backward: boolean } | null
    },
  ): void => {
    const host = context?.element ?? blockRefs[blockId]
    if (!host) return
    const offsets = context?.offsets ?? getSelectionOffsets(host)
    if (!offsets) return
    savedSelectionRef.current = { blockId, ...offsets }
  }

  // Keep caret position on re-render
  useLayoutEffect(() => {
    if (!savedSelectionRef.current) return
    const { start, end } = savedSelectionRef.current
    if (start !== end) return
    
    // We need access to blockRefs here, but it's managed externally
    // This will be used in the main component
  }, [blocks])

  // Selection end guard
  useEffect(() => {
    const handleUp = (): void => {
      isSelectingRef.current = false
    }
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mouseup', handleUp)
    }
  }, [])

  return {
    savedSelectionRef,
    isSelectingRef,
    saveSelectionForBlock,
  }
}

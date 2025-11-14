import { useEffect, useRef } from 'react'
import type { DocumentBlock } from '@/types/documents'
import { AUTOSAVE_DELAY } from '../_constants'

export const useAutosave = (
  blocks: DocumentBlock[],
  onSave?: (blocks: DocumentBlock[]) => void,
  initialBlocks?: DocumentBlock[],
) => {
  const lastEmittedSnapshotRef = useRef<string>(JSON.stringify(initialBlocks ?? []))

  useEffect((): (() => void) | void => {
    if (!onSave) return
    const snapshot = JSON.stringify(blocks ?? [])
    if (snapshot === lastEmittedSnapshotRef.current) return
    const tid = setTimeout(() => {
      const currentSnapshot = JSON.stringify(blocks ?? [])
      if (currentSnapshot !== lastEmittedSnapshotRef.current) {
        lastEmittedSnapshotRef.current = currentSnapshot
        onSave(blocks)
      }
    }, AUTOSAVE_DELAY)
    return () => clearTimeout(tid)
  }, [blocks, onSave])
}

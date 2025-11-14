import type { DocumentBlock } from '@/types/documents'
import { PLACEHOLDER_TEXTS } from '../_constants'

export const getBlockPlaceholder = (type: DocumentBlock['type']): string => {
  return PLACEHOLDER_TEXTS[type] || "Type '/' for commands"
}

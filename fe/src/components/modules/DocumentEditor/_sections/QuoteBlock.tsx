import type { ReactElement } from 'react'
import type { DocumentBlock } from '@/types/documents'
import { normalizeAnchors } from '../_utils/link'

interface QuoteBlockProps {
  block: DocumentBlock
  readOnly: boolean
  placeholder: string
  blockRef: (el: HTMLDivElement | null) => void
  prevContentRef: React.MutableRefObject<{ [key: string]: string }>
  onFocus: () => void
  onMouseDown: () => void
  onKeyUp: () => void
  onClick: (e: React.MouseEvent) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onInput: (e: React.FormEvent<HTMLDivElement>) => void
  onPaste: (e: React.ClipboardEvent) => void
}

export const QuoteBlock = ({
  block,
  readOnly,
  placeholder,
  blockRef,
  prevContentRef,
  onFocus,
  onMouseDown,
  onKeyUp,
  onClick,
  onKeyDown,
  onInput,
  onPaste,
}: QuoteBlockProps): ReactElement => {
  return (
    <div
      ref={(el): void => {
        blockRef(el)
        if (!el) return
        if (document.activeElement !== el) {
          const next = block.content || ''
          if (prevContentRef.current[block.id] !== next) {
            el.innerHTML = next
            prevContentRef.current[block.id] = next
          }
        }
        normalizeAnchors(el as unknown as HTMLElement)
      }}
      className="ce-editable w-full outline-none overflow-hidden min-h-[1.5em] text-left text-gray-900 focus:outline-none border-l-4 border-gray-300 pl-4 italic bg-gray-50"
      contentEditable={!readOnly}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onFocus={onFocus}
      onMouseDown={onMouseDown}
      onKeyUp={onKeyUp}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onInput={onInput}
      onPaste={onPaste}
    />
  )
}

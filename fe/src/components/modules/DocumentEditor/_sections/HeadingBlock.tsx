import type { ReactElement } from 'react'

import type { DocumentBlock } from '@/types/documents'

import { normalizeAnchors } from '../_utils/link'

interface HeadingBlockProps {
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

export const HeadingBlock = ({
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
}: HeadingBlockProps): ReactElement => {
  const typeClass =
    block.type === 'heading1'
      ? 'text-3xl font-bold'
      : block.type === 'heading2'
        ? 'text-2xl font-semibold'
        : 'text-xl font-medium'

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
      className={`ce-editable whitespace-pre-wrap w-full bg-transparent outline-none overflow-hidden min-h-[1.5em] text-left text-gray-900 focus:outline-none focus:bg-primary/5 rounded hover:bg-primary/5  transition-all duration-200 ${typeClass}`}
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

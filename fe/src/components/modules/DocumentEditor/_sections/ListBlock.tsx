import type { ReactElement } from 'react'
import type { DocumentBlock } from '@/types/documents'
import { normalizeAnchors } from '../_utils/link'

interface ListBlockProps {
  block: DocumentBlock
  blocks: DocumentBlock[]
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

export const ListBlock = ({
  block,
  blocks,
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
}: ListBlockProps): ReactElement => {
  const isNumbered = block.type === 'numbered-list'
  const listIndex = isNumbered
    ? blocks.filter(
        (b, i) =>
          i <= blocks.findIndex((b) => b.id === block.id) &&
          b.type === 'numbered-list',
      ).length
    : null

  return (
    <div className="flex items-start space-x-2">
      <span className="text-gray-500 select-none">
        {isNumbered ? `${listIndex}.` : '•'}
      </span>
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
        className="ce-editable flex-1 w-full bg-transparent outline-none overflow-hidden min-h-[1.5em] text-left text-gray-900 focus:outline-none"
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
    </div>
  )
}

import type { ReactElement } from 'react'

import type { DocumentBlock } from '@/types/documents'

interface CodeBlockProps {
  block: DocumentBlock
  readOnly: boolean
  placeholder: string
  updateBlock: (id: string, updates: Partial<DocumentBlock>) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export const CodeBlock = ({
  block,
  readOnly,
  placeholder,
  updateBlock,
  onKeyDown,
}: CodeBlockProps): ReactElement => {
  return (
    <textarea
      className="w-full font-mono text-sm bg-gray-100 p-3 rounded outline-none"
      rows={1}
      placeholder={placeholder}
      value={block.content}
      disabled={readOnly}
      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
      onKeyDown={(e) => onKeyDown(e)}
      onInput={(e): void => {
        const target = e.currentTarget
        target.style.height = 'auto'
        target.style.height = `${target.scrollHeight}px`
      }}
    />
  )
}

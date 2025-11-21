import { Link as LinkIcon } from 'lucide-react'
import type { DocumentBlock } from '@/types/documents'

import { BLOCK_TYPE_OPTIONS } from './index'

export interface CommandOption {
  type: DocumentBlock['type'] | 'link'
  label: string
  description: string
  keywords: string[]
  icon: React.ComponentType<{ className?: string }>
}

function getCommandDescription(type: DocumentBlock['type'] | 'link'): string {
  switch (type) {
    case 'heading1':
      return 'Large heading'
    case 'heading2':
      return 'Medium heading'
    case 'heading3':
      return 'Small heading'
    case 'bulleted-list':
      return 'Unordered list with bullets'
    case 'numbered-list':
      return 'Ordered list with numbers'
    case 'quote':
      return 'Quote or citation block'
    case 'code':
      return 'Code block with syntax highlighting'
    case 'image':
      return 'Insert an image'
    case 'file':
      return 'Insert a file attachment'
    case 'table':
      return 'Insert a table (use /table 3x4 for dimensions)'
    case 'link':
      return 'Insert a hyperlink'
    default:
      return 'Plain text paragraph'
  }
}

function getCommandKeywords(type: DocumentBlock['type'] | 'link', label: string): string[] {
  const baseKeywords = [label.toLowerCase(), type.toLowerCase()]
  switch (type) {
    case 'heading1':
      return [...baseKeywords, 'h1', 'title', 'header']
    case 'heading2':
      return [...baseKeywords, 'h2', 'subtitle', 'subheader']
    case 'heading3':
      return [...baseKeywords, 'h3', 'subsubtitle']
    case 'bulleted-list':
      return [...baseKeywords, 'bullet', 'ul', 'unordered']
    case 'numbered-list':
      return [...baseKeywords, 'number', 'ol', 'ordered']
    case 'quote':
      return [...baseKeywords, 'citation', 'blockquote']
    case 'code':
      return [...baseKeywords, 'codeblock', 'snippet']
    case 'image':
      return [...baseKeywords, 'img', 'picture', 'photo']
    case 'file':
      return [...baseKeywords, 'attachment', 'document']
    case 'table':
      return [...baseKeywords, 'grid', 'spreadsheet']
    case 'link':
      return [...baseKeywords, 'url', 'hyperlink', 'anchor']
    default:
      return baseKeywords
  }
}

export const COMMAND_OPTIONS: CommandOption[] = [
  ...BLOCK_TYPE_OPTIONS.map(({ type, icon, label }) => ({
    type,
    label,
    description: getCommandDescription(type),
    keywords: getCommandKeywords(type, label),
    icon,
  })),
  {
    type: 'link' as const,
    label: 'Link',
    description: 'Insert a hyperlink',
    keywords: ['link', 'url', 'hyperlink', 'anchor'],
    icon: LinkIcon,
  },
]


import {
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Image,
  FileText,
  Table,
} from 'lucide-react'

import type { DocumentBlock } from '@/types/documents'

export const BLOCK_TYPE_OPTIONS = [
  { type: 'paragraph' as const, icon: Type, label: 'Text' },
  { type: 'heading1' as const, icon: Heading1, label: 'Heading 1' },
  { type: 'heading2' as const, icon: Heading2, label: 'Heading 2' },
  { type: 'heading3' as const, icon: Heading3, label: 'Heading 3' },
  { type: 'bulleted-list' as const, icon: List, label: 'Bulleted list' },
  { type: 'numbered-list' as const, icon: ListOrdered, label: 'Numbered list' },
  { type: 'quote' as const, icon: Quote, label: 'Quote' },
  { type: 'code' as const, icon: Code, label: 'Code' },
  { type: 'image' as const, icon: Image, label: 'Image' },
  { type: 'file' as const, icon: FileText, label: 'File' },
  { type: 'table' as const, icon: Table, label: 'Table' },
]

export const MERGEABLE_BLOCK_TYPES: DocumentBlock['type'][] = [
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'bulleted-list',
  'numbered-list',
  'quote',
  'code',
]

export const PLACEHOLDER_TEXTS: Record<DocumentBlock['type'], string> = {
  paragraph: "Type '/' for commands",
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  'bulleted-list': 'Bulleted list',
  'numbered-list': 'Numbered list',
  quote: 'Quote',
  code: 'Code block',
  image: 'Enter image URL or upload an image',
  file: 'Enter file name or upload a file',
  table: 'Insert table content',
}

export const DEFAULT_TABLE_ROWS = 3
export const DEFAULT_TABLE_COLUMNS = 3

export const AUTOSAVE_DELAY = 1500

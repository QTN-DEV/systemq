/**
 * Migration utility to convert DocumentBlock[] to HTML string.
 * Used during transition from block-based to TipTap HTML-based editor.
 */

import type { DocumentBlock } from '@/types/documents'

/**
 * Converts a single DocumentBlock to HTML string.
 */
function blockToHtml(block: DocumentBlock): string {
  const content = block.content ?? ''
  const alignment = block.alignment ?? 'left'

  switch (block.type) {
    case 'paragraph':
      return `<p style="text-align: ${alignment}">${escapeHtml(content)}</p>`

    case 'heading1':
      return `<h1 style="text-align: ${alignment}">${escapeHtml(content)}</h1>`

    case 'heading2':
      return `<h2 style="text-align: ${alignment}">${escapeHtml(content)}</h2>`

    case 'heading3':
      return `<h3 style="text-align: ${alignment}">${escapeHtml(content)}</h3>`

    case 'bulleted-list':
      // Parse list items (assuming newline-separated or single item)
      const bulletItems = content.split('\n').filter((item) => item.trim())
      if (bulletItems.length === 0) {
        return '<ul><li></li></ul>'
      }
      return `<ul>${bulletItems.map((item) => `<li>${escapeHtml(item.trim())}</li>`).join('')}</ul>`

    case 'numbered-list':
      const numberedItems = content.split('\n').filter((item) => item.trim())
      if (numberedItems.length === 0) {
        return '<ol><li></li></ol>'
      }
      return `<ol>${numberedItems.map((item) => `<li>${escapeHtml(item.trim())}</li>`).join('')}</ol>`

    case 'quote':
      return `<blockquote>${escapeHtml(content)}</blockquote>`

    case 'code':
      return `<pre><code>${escapeHtml(content)}</code></pre>`

    case 'image':
      if (block.url) {
        return `<img src="${escapeHtml(block.url)}" alt="${escapeHtml(content ?? 'Image')}" />`
      }
      return `<p>${escapeHtml(content ?? 'Image')}</p>`

    case 'file':
      if (block.url) {
        const fileName = block.fileName ?? content ?? 'File'
        return `<p><a href="${escapeHtml(block.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fileName)}</a></p>`
      }
      return `<p>${escapeHtml(block.fileName ?? content ?? 'File')}</p>`

    case 'table':
      if (block.table && block.table.rows) {
        let html = '<table><tbody>'
        for (const row of block.table.rows) {
          html += '<tr>'
          for (const cell of row.cells) {
            const cellContent = cell.content ?? ''
            html += `<td>${escapeHtml(cellContent)}</td>`
          }
          html += '</tr>'
        }
        html += '</tbody></table>'
        return html
      }
      return '<table><tbody><tr><td></td></tr></tbody></table>'

    default:
      return `<p>${escapeHtml(content)}</p>`
  }
}

/**
 * Escapes HTML special characters.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Converts an array of DocumentBlocks to a single HTML string.
 * Blocks are concatenated with newlines for readability.
 */
export function migrateBlocksToHtml(blocks: DocumentBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return '<p></p>'
  }

  return blocks.map(blockToHtml).join('\n')
}

/**
 * Converts HTML string back to DocumentBlock[] (for backward compatibility if needed).
 * This is a simplified conversion - may not preserve all formatting.
 */
export function migrateHtmlToBlocks(html: string): DocumentBlock[] {
  if (!html || html.trim() === '') {
    return [
      {
        id: `block-${Date.now()}`,
        type: 'paragraph',
        content: '',
      },
    ]
  }

  // Create a temporary DOM element to parse HTML
  const temp = document.createElement('div')
  temp.innerHTML = html

  const blocks: DocumentBlock[] = []
  let blockId = 1

  // Parse each top-level element
  Array.from(temp.children).forEach((element) => {
    const tagName = element.tagName.toLowerCase()
    const textContent = element.textContent ?? ''

    let block: DocumentBlock | null = null

    switch (tagName) {
      case 'p':
        block = {
          id: `block-${blockId++}`,
          type: 'paragraph',
          content: textContent,
        }
        break

      case 'h1':
        block = {
          id: `block-${blockId++}`,
          type: 'heading1',
          content: textContent,
        }
        break

      case 'h2':
        block = {
          id: `block-${blockId++}`,
          type: 'heading2',
          content: textContent,
        }
        break

      case 'h3':
        block = {
          id: `block-${blockId++}`,
          type: 'heading3',
          content: textContent,
        }
        break

      case 'ul':
        const ulItems = Array.from(element.querySelectorAll('li'))
          .map((li) => li.textContent ?? '')
          .join('\n')
        block = {
          id: `block-${blockId++}`,
          type: 'bulleted-list',
          content: ulItems,
        }
        break

      case 'ol':
        const olItems = Array.from(element.querySelectorAll('li'))
          .map((li) => li.textContent ?? '')
          .join('\n')
        block = {
          id: `block-${blockId++}`,
          type: 'numbered-list',
          content: olItems,
        }
        break

      case 'blockquote':
        block = {
          id: `block-${blockId++}`,
          type: 'quote',
          content: textContent,
        }
        break

      case 'pre':
        const codeElement = element.querySelector('code')
        block = {
          id: `block-${blockId++}`,
          type: 'code',
          content: codeElement?.textContent ?? textContent,
        }
        break

      case 'img':
        const img = element as HTMLImageElement
        block = {
          id: `block-${blockId++}`,
          type: 'image',
          content: img.alt ?? '',
          url: img.src,
        }
        break

      case 'table':
        // Parse table structure
        const rows: Array<{ id: string; cells: Array<{ id: string; content: string }> }> = []
        const tableRows = element.querySelectorAll('tr')
        tableRows.forEach((row, rowIndex) => {
          const cells: Array<{ id: string; content: string }> = []
          row.querySelectorAll('td, th').forEach((cell, cellIndex) => {
            cells.push({
              id: `cell-${rowIndex}-${cellIndex}`,
              content: cell.textContent ?? '',
            })
          })
          if (cells.length > 0) {
            rows.push({
              id: `row-${rowIndex}`,
              cells,
            })
          }
        })
        if (rows.length > 0) {
          block = {
            id: `block-${blockId++}`,
            type: 'table',
            content: '',
            table: { rows },
          }
        }
        break

      default:
        // For unknown tags, create a paragraph
        block = {
          id: `block-${blockId++}`,
          type: 'paragraph',
          content: textContent,
        }
    }

    if (block) {
      blocks.push(block)
    }
  })

  // If no blocks were created, create an empty paragraph
  if (blocks.length === 0) {
    blocks.push({
      id: `block-${Date.now()}`,
      type: 'paragraph',
      content: '',
    })
  }

  return blocks
}


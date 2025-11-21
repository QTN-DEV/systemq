export const createAnchorHTML = (href: string, text?: string): string =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer" contenteditable="false" class="inline-editor-link" data-inline-link="1">${text ?? href}</a>`

export const normalizeAnchors = (el: HTMLElement): void => {
  const anchors = el.querySelectorAll('a')
  anchors.forEach((a) => {
    a.setAttribute('target', '_blank')
    a.setAttribute('rel', 'noopener noreferrer')
    a.setAttribute('contenteditable', 'false')
    a.classList.add('inline-editor-link')
    a.setAttribute('data-inline-link', '1')
  })
}

export const replaceRangeWithAnchor = (range: Range, href: string, text: string): void => {
  const anchor = document.createElement('a')
  anchor.setAttribute('href', href)
  anchor.setAttribute('target', '_blank')
  anchor.setAttribute('rel', 'noopener noreferrer')
  anchor.setAttribute('contenteditable', 'false')
  anchor.classList.add('inline-editor-link')
  anchor.setAttribute('data-inline-link', '1')
  anchor.textContent = text ?? href
  range.deleteContents()
  range.insertNode(anchor)
}

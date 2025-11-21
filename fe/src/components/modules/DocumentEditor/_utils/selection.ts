export const getSelectionOffsets = (
  element: HTMLElement,
): { start: number; end: number; backward: boolean } | null => {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!element.contains(range.commonAncestorContainer)) return null

  const preRangeStart = range.cloneRange()
  preRangeStart.selectNodeContents(element)
  preRangeStart.setEnd(range.startContainer, range.startOffset)
  const start = preRangeStart.toString().length

  const preRangeEnd = range.cloneRange()
  preRangeEnd.selectNodeContents(element)
  preRangeEnd.setEnd(range.endContainer, range.endOffset)
  const end = preRangeEnd.toString().length

  let backward = false
  try {
    if (sel.anchorNode && sel.focusNode) {
      if (sel.anchorNode === sel.focusNode) {
        backward = sel.anchorOffset > sel.focusOffset
      } else {
        const pos = sel.anchorNode.compareDocumentPosition(sel.focusNode)
        backward = Boolean(pos & Node.DOCUMENT_POSITION_PRECEDING)
      }
    }
  } catch {
    // Ignore errors from selection comparison
  }
  return { start, end, backward }
}

export const setSelectionOffsets = (
  element: HTMLElement,
  start: number,
  end: number,
  backward = false,
): void => {
  let charIndex = 0
  let startNode: Text | null = null
  let startOffsetInNode = 0
  let endNode: Text | null = null
  let endOffsetInNode = 0

  const stack: Node[] = [element]
  let node: Node | undefined
  while ((node = stack.pop())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node as Text
      const nextChar = charIndex + text.length
      if (!startNode && start >= charIndex && start <= nextChar) {
        startNode = text
        startOffsetInNode = Math.max(0, Math.min(text.length, start - charIndex))
      }
      if (!endNode && end >= charIndex && end <= nextChar) {
        endNode = text
        endOffsetInNode = Math.max(0, Math.min(text.length, end - charIndex))
      }
      charIndex = nextChar
      if (startNode && endNode) break
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const children = (node as Element).childNodes
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i])
    }
  }

  const sel = window.getSelection()
  if (!sel) return
  sel.removeAllRanges()
  try {
    if (sel.setBaseAndExtent && startNode && endNode) {
      if (backward) sel.setBaseAndExtent(endNode, endOffsetInNode, startNode, startOffsetInNode)
      else sel.setBaseAndExtent(startNode, startOffsetInNode, endNode, endOffsetInNode)
      return
    }
  } catch {
    // Ignore errors from setBaseAndExtent
  }

  const range = document.createRange()
  if (startNode) range.setStart(startNode, startOffsetInNode)
  else range.setStart(element, 0)
  if (endNode) range.setEnd(endNode, endOffsetInNode)
  else range.setEnd(element, element.childNodes.length)
  sel.addRange(range)
}

export const buildRangeWithin = (element: HTMLElement, start: number, end: number): Range => {
  let charIndex = 0
  let startNode: Text | null = null
  let startOffsetInNode = 0
  let endNode: Text | null = null
  let endOffsetInNode = 0

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)
  let node: Node | null = walker.nextNode()
  while (node) {
    const text = node as Text
    const nextChar = charIndex + text.length
    if (!startNode && start >= charIndex && start <= nextChar) {
      startNode = text
      startOffsetInNode = Math.max(0, Math.min(text.length, start - charIndex))
    }
    if (!endNode && end >= charIndex && end <= nextChar) {
      endNode = text
      endOffsetInNode = Math.max(0, Math.min(text.length, end - charIndex))
    }
    charIndex = nextChar
    if (startNode && endNode) break
    node = walker.nextNode()
  }
  const range = document.createRange()
  if (startNode) range.setStart(startNode, startOffsetInNode)
  else range.setStart(element, 0)
  if (endNode) range.setEnd(endNode, endOffsetInNode)
  else range.setEnd(element, element.childNodes.length)
  return range
}

export const isSelectionInside = (element: HTMLElement): boolean => {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false
  const range = sel.getRangeAt(0)
  return element.contains(range.commonAncestorContainer)
}

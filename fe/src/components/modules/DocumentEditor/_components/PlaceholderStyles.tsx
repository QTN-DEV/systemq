import type { ReactElement } from 'react'

export const PlaceholderStyles = (): ReactElement => (
  <style>{`
  .ce-editable[contenteditable="true"]:empty:before {
    content: attr(data-placeholder);
    color: #9ca3af;
    pointer-events: none;
    opacity: 0.9;
  }
  .ce-editable a {
    color: #2563eb;
    text-decoration: underline;
    text-underline-offset: 2px;
    font-size: inherit;
    line-height: inherit;
    font-weight: inherit;
    word-break: break-word;
  }
  .ce-editable a:hover { color: #1d4ed8; }
  .inline-editor-link { cursor: pointer; }
`}</style>
)

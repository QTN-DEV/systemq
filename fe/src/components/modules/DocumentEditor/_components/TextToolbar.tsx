import { Bold, Italic, Underline, X } from 'lucide-react'
import type { ReactElement } from 'react'

import type { ToolbarPosition, FormatState } from '../_types'

interface TextToolbarProps {
  position: ToolbarPosition
  formatState: FormatState
  onFormat: (command: 'bold' | 'italic' | 'underline') => void
  onClose: () => void
}

export const TextToolbar = ({
  position,
  formatState,
  onFormat,
  onClose,
}: TextToolbarProps): ReactElement => (
  <div
    className="fixed z-20 bg-white border border-gray-200 shadow-lg rounded-md px-1 py-0.5 flex items-center space-x-0.5"
    style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%)' }}
    onMouseDown={(e) => e.preventDefault()}
  >
    <button
      className={`p-1 rounded hover:bg-gray-100 ${
        formatState.bold ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
      }`}
      title="Bold"
      onClick={() => onFormat('bold')}
    >
      <Bold className="w-4 h-4" />
    </button>
    <button
      className={`p-1 rounded hover:bg-gray-100 ${
        formatState.italic ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
      }`}
      title="Italic"
      onClick={() => onFormat('italic')}
    >
      <Italic className="w-4 h-4" />
    </button>
    <button
      className={`p-1 rounded hover:bg-gray-100 ${
        formatState.underline ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
      }`}
      title="Underline"
      onClick={() => onFormat('underline')}
    >
      <Underline className="w-4 h-4" />
    </button>
    <button
      className="p-1 rounded hover:bg-gray-100 text-gray-700"
      title="Close"
      onClick={onClose}
    >
      <X className="w-4 h-4" />
    </button>
  </div>
)

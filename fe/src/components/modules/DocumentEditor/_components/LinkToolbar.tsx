import { Link as LinkIcon, X } from 'lucide-react'
import type { ReactElement } from 'react'

import type { ToolbarPosition } from '../_types'

interface LinkToolbarProps {
  position: ToolbarPosition
  onEdit: () => void
  onRemove: () => void
  forwardRef?: React.RefObject<HTMLDivElement | null>
}

export const LinkToolbar = ({
  position,
  onEdit,
  onRemove,
  forwardRef,
}: LinkToolbarProps): ReactElement => (
  <div
    ref={forwardRef}
    className="fixed z-30 bg-white border border-gray-200 shadow-lg rounded-md px-1 py-0.5 flex items-center space-x-0.5"
    style={{ left: position.x, top: position.y, transform: 'translate(-50%, 0%)' }}
    onMouseDown={(e) => e.preventDefault()}
  >
    <button
      className="p-1 rounded hover:bg-gray-100 text-gray-700"
      title="Edit link (change text / URL)"
      onClick={onEdit}
    >
      <LinkIcon className="w-4 h-4" />
    </button>
    <button
      className="p-1 rounded hover:bg-gray-100 text-gray-700"
      title="Remove link"
      onClick={onRemove}
    >
      <X className="w-4 h-4" />
    </button>
  </div>
)

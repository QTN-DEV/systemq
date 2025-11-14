import type { ReactElement } from 'react'
import { Link as LinkIcon } from 'lucide-react'
import type { DocumentBlock } from '@/types/documents'
import { BLOCK_TYPE_OPTIONS } from '../_constants'
import type { MenuPlacement } from '../_types'

interface GripMenuProps {
  blockId: string
  onChangeBlockType: (blockId: string, newType: DocumentBlock['type']) => void
  placement?: MenuPlacement
  onClose: () => void
  onOpenLinkDialog: (blockId: string) => void
}

export const GripMenu = ({
  blockId,
  onChangeBlockType,
  placement = 'bottom',
  onClose,
  onOpenLinkDialog,
}: GripMenuProps): ReactElement => (
  <div
    className={`absolute left-0 ${
      placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
    } bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[220px] z-10`}
  >
    <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
      Change to
    </div>
    {BLOCK_TYPE_OPTIONS.map(({ type, icon: Icon, label }) => (
      <button
        key={type}
        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
        onClick={() => {
          onChangeBlockType(blockId, type)
          onClose()
        }}
      >
        <Icon className="w-5 h-5 text-gray-400" />
        <div className="text-sm font-medium text-gray-900">{label}</div>
      </button>
    ))}
    <div className="border-t border-gray-100 my-1" />
    <button
      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
      onClick={() => {
        onChangeBlockType(blockId, 'paragraph')
        onClose()
        onOpenLinkDialog(blockId)
      }}
      title="Insert/edit link"
    >
      <LinkIcon className="w-5 h-5 text-gray-400" />
      <div className="text-sm font-medium text-gray-900">Link</div>
    </button>
  </div>
)

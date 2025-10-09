import { X } from 'lucide-react'
import { useMemo, type ReactElement } from 'react'
import type { EditHistoryEvent } from '../types/documents'

interface EditHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  events: EditHistoryEvent[] | null
  error: string | null
}

function EditHistoryModal({ isOpen, onClose, events, error }: EditHistoryModalProps): ReactElement {
  const sorted = useMemo(() => {
    if (!events) return []
    return [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [events])

  if (!isOpen) return <></>

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit History</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="text-sm text-red-600 mb-3">{error}</div>
          )}

          {!error && (!events || events.length === 0) && (
            <div className="text-sm text-gray-500">No edit history.</div>
          )}

          {!error && sorted.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {sorted.map((e, idx) => (
                <li key={`${e.editor.id}-${e.at}-${idx}`} className="py-3">
                  <div className="text-sm text-gray-900">
                    <span className="font-medium">{e.editor.name}</span>
                    <span className="text-gray-500"> edited</span>
                  </div>
                  <div className="text-xs text-gray-500">{new Date(e.at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">Close</button>
        </div>
      </div>
    </div>
  )
}

export default EditHistoryModal



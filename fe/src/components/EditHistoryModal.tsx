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
  // Group by date buckets and editor within small time windows (e.g., 5 minutes)
  const grouped = useMemo(() => {
    if (!events || events.length === 0) return [] as Array<{
      dateLabel: string
      entries: Array<{ editorName: string; count: number; startMs: number; endMs: number }>
    }>

    const byDay: Record<string, EditHistoryEvent[]> = {}
    const sortedAsc = [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

    for (const e of sortedAsc) {
      const d = new Date(e.at)
      const key = d.toDateString()
      if (!byDay[key]) byDay[key] = []
      byDay[key].push(e)
    }

    const result: Array<{ dateLabel: string; entries: Array<{ editorName: string; count: number; startMs: number; endMs: number }> }> = []

    for (const [dateLabel, dayEvents] of Object.entries(byDay)) {
      // Within the day, group consecutive events by same editor within 5 minutes window
      const entries: Array<{ editorName: string; count: number; startMs: number; endMs: number }> = []
      let windowStart: Date | null = null
      let windowEnd: Date | null = null
      let currentEditor: string | null = null
      let currentCount = 0

      const flush = () => {
        if (currentEditor && windowStart && windowEnd) {
          entries.push({
            editorName: currentEditor,
            count: currentCount,
            startMs: windowStart.getTime(),
            endMs: windowEnd.getTime(),
          })
        }
        windowStart = null
        windowEnd = null
        currentEditor = null
        currentCount = 0
      }

      for (const e of dayEvents) {
        const t = new Date(e.at)
        if (!currentEditor) {
          currentEditor = e.editor.name
          windowStart = t
          windowEnd = t
          currentCount = 1
          continue
        }
        const isSameEditor = currentEditor === e.editor.name
        const diffMs = t.getTime() - (windowEnd?.getTime() ?? t.getTime())
        const withinFiveMin = diffMs <= 5 * 60 * 1000
        if (isSameEditor && withinFiveMin) {
          currentCount += 1
          windowEnd = t
        } else {
          flush()
          currentEditor = e.editor.name
          windowStart = t
          windowEnd = t
          currentCount = 1
        }
      }
      flush()

      // Latest groups first within the day by end time
      entries.sort((a, b) => b.endMs - a.endMs)
      result.push({ dateLabel, entries })
    }

    // Latest day first
    result.sort((a, b) => new Date(a.dateLabel).getTime() < new Date(b.dateLabel).getTime() ? 1 : -1)
    return result
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

          {!error && grouped.length > 0 && (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.dateLabel}>
                  <div className="text-xs font-semibold text-gray-500 mb-1">{g.dateLabel}</div>
                  <ul className="divide-y divide-gray-100">
                    {g.entries.map((entry, i) => (
                      <li key={`${g.dateLabel}-${entry.editorName}-${i}`} className="py-3">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">{entry.editorName}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const startStr = new Date(entry.startMs).toLocaleTimeString()
                            const endStr = new Date(entry.endMs).toLocaleTimeString()
                            return entry.startMs === entry.endMs ? startStr : `${startStr}–${endStr}`
                          })()}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
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



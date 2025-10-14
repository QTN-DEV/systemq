import { X } from 'lucide-react'
import { useMemo, type ReactElement } from 'react'
import type { EditHistoryEvent } from '../types/documents'

interface EditHistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  events: EditHistoryEvent[] | null
  error: string | null
}

function EditHistorySidebar({ isOpen, onClose, events, error }: EditHistorySidebarProps): ReactElement {
  // Group by date buckets and editor within small time windows (e.g., 5 minutes)
  const grouped = useMemo(() => {
    if (!events || events.length === 0) return [] as Array<{
      dateLabel: string
      entries: Array<{ editor: EditHistoryEvent['editor']; count: number; startMs: number; endMs: number }>
    }>

    const byMonth: Record<string, { label: string; events: EditHistoryEvent[]; sortMs: number }> = {}
    const sortedAsc = [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

    for (const e of sortedAsc) {
      const d = new Date(e.at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      const monthStartMs = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      if (!byMonth[key]) {
        byMonth[key] = { label, events: [], sortMs: monthStartMs }
      }
      byMonth[key].events.push(e)
    }

    const result: Array<{
      dateLabel: string
      entries: Array<{ editor: EditHistoryEvent['editor']; count: number; startMs: number; endMs: number }>
      sortMs: number
    }> = []

    for (const { label: dateLabel, events: monthEvents, sortMs } of Object.values(byMonth)) {
      // Within the month, group consecutive events by same editor within 5 minutes window
      const entries: Array<{ editor: EditHistoryEvent['editor']; count: number; startMs: number; endMs: number }> = []
      let windowStart: Date | null = null
      let windowEnd: Date | null = null
      let currentEditor: EditHistoryEvent['editor'] | null = null
      let currentCount = 0

      const flush = () => {
        if (currentEditor && windowStart && windowEnd) {
          entries.push({
            editor: currentEditor,
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

      for (const e of monthEvents) {
        const t = new Date(e.at)
        if (!currentEditor) {
          currentEditor = e.editor
          windowStart = t
          windowEnd = t
          currentCount = 1
          continue
        }
        const isSameEditor = currentEditor?.id === e.editor.id
        const diffMs = t.getTime() - (windowEnd?.getTime() ?? t.getTime())
        const withinFiveMin = diffMs <= 5 * 60 * 1000
        if (isSameEditor && withinFiveMin) {
          currentCount += 1
          windowEnd = t
        } else {
          flush()
          currentEditor = e.editor
          windowStart = t
          windowEnd = t
          currentCount = 1
        }
      }
      flush()

      // Latest groups first within the day by end time
      entries.sort((a, b) => b.endMs - a.endMs)
      result.push({ dateLabel, entries, sortMs })
    }

    // Latest month first
    result.sort((a, b) => b.sortMs - a.sortMs)
    return result.map(({ sortMs, ...rest }) => rest)
  }, [events])

  if (!isOpen) return <></>

  return (
    <aside className="w-full border-t border-gray-200 bg-slate-50 h-full flex flex-col flex-shrink-0 sm:max-w-sm lg:w-80 xl:w-80 lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Version History</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 transition-colors rounded-full hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 h-full ">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        {!error && events === null && (
          <div className="text-sm text-gray-500">Loading edit history...</div>
        )}

        {!error && Array.isArray(events) && events.length === 0 && (
          <div className="text-sm text-gray-500">No edit history recorded yet.</div>
        )}

        {!error && grouped.length > 0 && events && (
          <div className="space-y-6">
            {grouped.map((g) => (
              <div key={g.dateLabel}>
                <div className="text-md font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  {g.dateLabel}
                </div>
                <ul className="space-y-1.5">
                  {g.entries.map((entry, i) => {
                    const start = new Date(entry.startMs)
                    const end = new Date(entry.endMs)
                    const dateLabel = end.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                    const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const timeRange = entry.startMs === entry.endMs ? startStr : `${startStr} – ${endStr}`
                    const dateTimeLabel = `${dateLabel}, ${timeRange}`
                    const avatarUrl = entry.editor.avatar ?? null
                    const initials = entry.editor.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()

                    return (
                      <li
                        key={`${g.dateLabel}-${entry.editor.id}-${entry.startMs}-${i}`}
                        className="rounded-2xl border border-gray-200 bg-slate-50  px-4 py-3 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="font-medium text-gray-600">{dateTimeLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={entry.editor.name}
                              className="h-7   w-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600 uppercase">
                              {initials || '?'}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-xs font-medium ">
                              Edited by 
                              <span className='text-gray-900'> {entry.editor.name} </span>
                            </p>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

export default EditHistorySidebar

import { type ReactElement, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'

import { PriorityBadge } from '../../components/PriorityBadge'
import { StatusBadge } from '../../components/StatusBadge'
import { useIssues } from '../../hooks/useIssues'
import { useIssueStatuses } from '../../hooks/useTrackerConfig'

export default function MyTasks(): ReactElement {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { data: issues = [], isLoading } = useIssues({ assignee_id: user?.id ?? '' })
  const { data: issueStatusConfig } = useIssueStatuses()

  const statusOrder = issueStatusConfig?.values ?? ['triage', 'todo', 'backlog', 'in_progress', 'in_review', 'done', 'canceled']

  const grouped = useMemo(() => {
    const active = issues.filter(i => !i.archived_at)
    const map = new Map<string, typeof active>()
    for (const s of statusOrder) map.set(s, [])
    for (const issue of active) {
      const bucket = map.get(issue.status)
      if (bucket) bucket.push(issue)
      else map.set(issue.status, [issue])
    }
    return map
  }, [issues, statusOrder])

  if (!user?.id) {
    return <div className="p-6 text-sm text-muted-foreground">Not authenticated.</div>
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">My Tasks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {issues.length} issue{issues.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!isLoading && issues.length === 0 && (
        <div className="text-sm text-muted-foreground">No issues assigned to you.</div>
      )}

      {Array.from(grouped.entries()).map(([status, items]) => {
        if (items.length === 0) return null
        return (
          <Card key={status}>
            <CardHeader className="pb-2 pt-4 px-4 flex-row items-center gap-2">
              <StatusBadge status={status} />
              <CardTitle className="text-sm font-normal text-muted-foreground">{items.length}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {items
                  .sort((a, b) => a.priority - b.priority)
                  .map(issue => (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/tracker/issues/${issue.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{issue.title}</p>
                        {issue.initiative_project_id && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Project: {issue.initiative_project_id.slice(0, 8)}…
                          </p>
                        )}
                      </div>
                      <PriorityBadge priority={issue.priority} className="ml-3 shrink-0" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

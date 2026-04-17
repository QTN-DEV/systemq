import { type ReactElement, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Search, LayoutGrid } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

import { PageLayout } from '../../components/PageLayout'
import { StatusIcon, PriorityIcon } from '../../components/IssueIcons'
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

  const breadcrumbs = [
    { label: 'Tracker', href: '/tracker/products' },
    { label: 'My Tasks' }
  ]

  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-3 text-muted-foreground hover:text-foreground">
        <LayoutGrid className="w-3.5 h-3.5" />
        <span>View</span>
      </Button>
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-3 text-muted-foreground hover:text-foreground">
        <Filter className="w-3.5 h-3.5" />
        <span>Filter</span>
      </Button>
    </div>
  )

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Please sign in to view your tasks.
      </div>
    )
  }

  return (
    <PageLayout breadcrumbs={breadcrumbs} actions={actions}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Summary */}
        <div className="px-8 py-6 border-b bg-muted/5">
           <div className="max-w-5xl mx-auto flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {issues.length} issue{issues.length !== 1 ? 's' : ''} assigned to you
                </p>
              </div>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto py-8 px-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-sm text-muted-foreground animate-pulse">
                Loading your tasks…
              </div>
            ) : issues.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center justify-center">
                 <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                   <Search className="w-6 h-6" />
                 </div>
                 <h3 className="text-base font-medium">No tasks assigned</h3>
                 <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    When issues are assigned to you, they will appear here for you to track and complete.
                 </p>
              </div>
            ) : (
              <div className="space-y-12">
                {Array.from(grouped.entries()).map(([status, items]) => {
                  if (items.length === 0) return null
                  return (
                    <div key={status} className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <StatusIcon status={status} className="w-4 h-4" />
                        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          {status.replace(/_/g, ' ')}
                        </h3>
                        <span className="text-[10px] font-bold text-muted-foreground/40 bg-muted/30 px-1.5 py-0.5 rounded-full">
                          {items.length}
                        </span>
                      </div>

                      <div className="border rounded-lg overflow-hidden divide-y divide-border/50 bg-card/30">
                        {items
                          .sort((a, b) => a.priority - b.priority)
                          .map(issue => (
                            <div
                              key={issue.id}
                              className="group flex items-center px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => navigate(`/tracker/issues/${issue.id}`)}
                            >
                              <div className="w-8 flex items-center justify-center mr-2 opacity-70 group-hover:opacity-100">
                                <PriorityIcon priority={issue.priority} />
                              </div>
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="text-sm font-medium tracking-tight truncate">{issue.title}</p>
                                {issue.initiative_project_id && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono uppercase tracking-tighter opacity-60">
                                    PROJ-{issue.initiative_project_id.slice(-4).toUpperCase()}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-end">
                                 <div className="w-2 h-2 rounded-full bg-primary/40" />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

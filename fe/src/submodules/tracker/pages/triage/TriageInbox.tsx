import { type ReactElement, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { 
  Inbox, 
  Search, 
  UserPlus, 
  MoveRight, 
  XCircle, 
  Archive, 
  MoreHorizontal,
  LayoutGrid,
  Filter
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'

import { PageLayout } from '../../components/PageLayout'
import { PriorityIcon } from '../../components/IssueIcons'
import { useInitiativeProjects } from '../../hooks/useInitiativeProjects'
import { useArchiveIssue, useIssues, useUpdateIssue } from '../../hooks/useIssues'
import type { TrackerIssue } from '../../types/issue'

function TimeAgo({ iso }: { iso: string }) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return <>just now</>
  if (mins < 60) return <>{mins}m ago</>
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return <>{hrs}h ago</>
  return <>{Math.floor(hrs / 24)}d ago</>
}

interface TriageRowProps {
  issue: TrackerIssue
  projects: Array<{ id: string; name: string; key: string }>
}

function TriageRow({ issue, projects }: TriageRowProps): ReactElement {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const updateIssue = useUpdateIssue()
  const archiveIssue = useArchiveIssue()
  const [movePending, setMovePending] = useState(false)

  const handleAssignToMe = async () => {
    if (!user?.id) return
    try {
      await updateIssue.mutateAsync({ id: issue.id, data: { assignee_id: user.id } })
      toast.success('Assigned to you')
    } catch {
      toast.error('Failed to assign')
    }
  }

  const handleMoveToProject = async (projectId: string) => {
    setMovePending(true)
    try {
      await updateIssue.mutateAsync({ id: issue.id, data: { initiative_project_id: projectId, status: 'todo' } })
      toast.success('Moved to project')
    } catch {
      toast.error('Failed to move issue')
    } finally {
      setMovePending(false)
    }
  }

  const handleCancel = async () => {
    try {
      await updateIssue.mutateAsync({ id: issue.id, data: { status: 'canceled' } })
    } catch {
      toast.error('Failed to cancel issue')
    }
  }

  const handleArchive = () => {
    archiveIssue.mutate(
      { id: issue.id, archive: true },
      { onError: () => toast.error('Failed to archive issue') }
    )
  }

  const busy = updateIssue.isPending || movePending || archiveIssue.isPending

  return (
    <div className="group flex items-center px-8 py-3 hover:bg-muted/50 transition-colors border-b border-border/40 last:border-b-0">
      <div className="w-8 flex items-center justify-center mr-4 opacity-70">
        <PriorityIcon priority={issue.priority} />
      </div>
      
      <div 
        className="flex-1 min-w-0 cursor-pointer pr-4"
        onClick={() => navigate(`/tracker/issues/${issue.id}`)}
      >
        <p className="text-sm font-medium tracking-tight truncate group-hover:text-foreground/90 transition-colors">
          {issue.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono text-muted-foreground/60">TRIAGE-{issue.id.slice(-4).toUpperCase()}</span>
          <span className="text-[10px] text-muted-foreground/40">•</span>
          <span className="text-[10px] text-muted-foreground/60"><TimeAgo iso={issue.created_at} /></span>
          {issue.reporter_id && (
            <>
              <span className="text-[10px] text-muted-foreground/40">•</span>
              <span className="text-[10px] text-muted-foreground/60">{issue.reporter_id.slice(0, 8)}…</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!issue.assignee_id && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] font-semibold gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={handleAssignToMe}
            disabled={busy}
          >
            <UserPlus className="w-3 h-3" />
            Assign
          </Button>
        )}
        
        <Select onValueChange={handleMoveToProject} disabled={busy}>
          <SelectTrigger className="h-7 px-2 border-none bg-secondary/50 hover:bg-secondary text-[11px] font-semibold gap-1.5 w-32 focus:ring-0">
            <MoveRight className="w-3 h-3 text-muted-foreground" />
            <SelectValue placeholder="Move to…" />
          </SelectTrigger>
          <SelectContent>
            {projects.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No projects</div>
            ) : (
              projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  <span className="font-mono mr-1 text-muted-foreground">{p.key}</span>
                  {p.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive transition-colors"
          onClick={handleCancel}
          disabled={busy}
          title="Cancel"
        >
          <XCircle className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleArchive}
          disabled={busy}
          title="Archive"
        >
          <Archive className="w-3.5 h-3.5" />
        </Button>
      </div>
      
      <div className="w-24 flex items-center justify-end ml-4 text-[10px] font-medium text-muted-foreground/40 uppercase group-hover:hidden">
         {issue.assignee_id ? 'Assigned' : 'Unassigned'}
      </div>
      <div className="w-8 flex items-center justify-center ml-2 group-hover:opacity-0 transition-opacity">
         <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
      </div>
    </div>
  )
}

export default function TriageInbox(): ReactElement {
  const { data: issues = [], isLoading } = useIssues({ status: 'triage' })
  const { data: projects = [] } = useInitiativeProjects()

  const breadcrumbs = [
    { label: 'Tracker', href: '/tracker/products' },
    { label: 'Triage Inbox' }
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

  return (
    <PageLayout breadcrumbs={breadcrumbs} actions={actions}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Summary */}
        <div className="px-8 py-6 border-b bg-muted/5">
           <div className="max-w-5xl mx-auto flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Triage Inbox</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {issues.length} issue{issues.length !== 1 ? 's' : ''} awaiting review and project assignment
                </p>
              </div>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground animate-pulse">
              Loading inbox…
            </div>
          ) : issues.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center justify-center">
               <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                 <Inbox className="w-6 h-6" />
               </div>
               <h3 className="text-base font-medium">Inbox zero</h3>
               <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  All issues have been triaged. Good work! New issues will appear here for review.
               </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {issues
                .sort((a, b) => a.priority - b.priority)
                .map(issue => (
                  <TriageRow key={issue.id} issue={issue} projects={projects} />
                ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

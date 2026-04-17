import { type ReactElement, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthStore } from '@/stores/authStore'

import { PriorityBadge } from '../../components/PriorityBadge'
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
    <TableRow>
      <TableCell className="w-8 pr-0">
        <PriorityBadge priority={issue.priority} />
      </TableCell>
      <TableCell
        className="cursor-pointer"
        onClick={() => navigate(`/tracker/issues/${issue.id}`)}
      >
        <p className="text-sm font-medium hover:underline">{issue.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          <TimeAgo iso={issue.created_at} />
          {issue.reporter_id && <> · {issue.reporter_id.slice(0, 8)}…</>}
        </p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground w-28">
        {issue.assignee_id ? `${issue.assignee_id.slice(0, 8)}…` : 'unassigned'}
      </TableCell>
      <TableCell className="w-80">
        <div className="flex items-center gap-1.5 flex-wrap">
          {!issue.assignee_id && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleAssignToMe}
              disabled={busy}
            >
              Assign to me
            </Button>
          )}
          <Select onValueChange={handleMoveToProject} disabled={busy}>
            <SelectTrigger className="h-7 text-xs w-36">
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
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={handleCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={handleArchive}
            disabled={busy}
          >
            Archive
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function TriageInbox(): ReactElement {
  const { data: issues = [], isLoading } = useIssues({ status: 'triage' })
  const { data: projects = [] } = useInitiativeProjects()

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Triage Inbox</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {issues.length} issue{issues.length !== 1 ? 's' : ''} awaiting triage
        </p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!isLoading && issues.length === 0 && (
        <div className="text-sm text-muted-foreground">No issues in triage.</div>
      )}

      {!isLoading && issues.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Issue</TableHead>
              <TableHead className="w-28">Assignee</TableHead>
              <TableHead className="w-80">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues
              .sort((a, b) => a.priority - b.priority)
              .map(issue => (
                <TriageRow key={issue.id} issue={issue} projects={projects} />
              ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

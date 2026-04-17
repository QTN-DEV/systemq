import { type ReactElement, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { PriorityBadge } from '../../components/PriorityBadge'
import { StatusBadge } from '../../components/StatusBadge'
import { useInitiative } from '../../hooks/useInitiatives'
import { useInitiativeProject, useUpdateInitiativeProject } from '../../hooks/useInitiativeProjects'
import { useCreateIssue, useIssues } from '../../hooks/useIssues'
import { useIssueStatuses } from '../../hooks/useTrackerConfig'

export default function InitiativeProjectDetail(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: project, isLoading } = useInitiativeProject(id!)
  const { data: initiative } = useInitiative(project?.initiative_id ?? '')
  const { data: issues = [] } = useIssues({ initiative_project_id: id })
  const { data: issueStatusConfig } = useIssueStatuses()
  const updateProject = useUpdateInitiativeProject()
  const createIssue = useCreateIssue()

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [newIssueOpen, setNewIssueOpen] = useState(false)
  const [issueForm, setIssueForm] = useState({ title: '', status: 'todo', priority: 3 })

  const issueStatuses = issueStatusConfig?.values ?? []
  const filteredIssues = statusFilter === 'all' ? issues : issues.filter(i => i.status === statusFilter)

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateProject.mutateAsync({ id: id!, data: { status: newStatus } })
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleCreateIssue = async () => {
    if (!issueForm.title.trim()) { toast.error('Title required'); return }
    try {
      const created = await createIssue.mutateAsync({
        title: issueForm.title.trim(),
        initiative_project_id: id,
        status: issueForm.status,
        priority: issueForm.priority,
      })
      toast.success('Issue created')
      setNewIssueOpen(false)
      setIssueForm({ title: '', status: 'todo', priority: 3 })
      navigate(`/tracker/issues/${created.id}`)
    } catch {
      toast.error('Failed to create issue')
    }
  }

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  if (!project) return <div className="p-6 text-sm text-destructive">Project not found.</div>

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
            <button onClick={() => navigate('/tracker/products')} className="hover:text-foreground">Products</button>
            <span>/</span>
            <button onClick={() => navigate(`/tracker/initiatives/${project.initiative_id}`)} className="hover:text-foreground">
              {initiative?.name ?? project.initiative_id}
            </button>
            <span>/</span>
            <span className="font-mono">{project.key}</span>
          </div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <Select value={project.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(issueStatusConfig?.values.length ? issueStatusConfig.values : ['planned', 'active', 'halted', 'done', 'canceled']).map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Issue list */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-medium">Issues</CardTitle>
            <span className="text-sm text-muted-foreground">{filteredIssues.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {issueStatuses.map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setNewIssueOpen(true)}>New Issue</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredIssues.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No issues{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue) => (
                  <TableRow
                    key={issue.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/tracker/issues/${issue.id}`)}
                  >
                    <TableCell className="font-medium">{issue.title}</TableCell>
                    <TableCell><StatusBadge status={issue.status} /></TableCell>
                    <TableCell><PriorityBadge priority={issue.priority} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New issue dialog */}
      <Dialog open={newIssueOpen} onOpenChange={setNewIssueOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Issue</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="Issue title"
                value={issueForm.title}
                onChange={e => setIssueForm({ ...issueForm, title: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateIssue() }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={issueForm.status} onValueChange={v => setIssueForm({ ...issueForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {issueStatuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={String(issueForm.priority)} onValueChange={v => setIssueForm({ ...issueForm, priority: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map(p => (
                    <SelectItem key={p} value={String(p)}>
                      {['Urgent', 'High', 'Medium', 'Low', 'No Priority'][p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewIssueOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateIssue} disabled={createIssue.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

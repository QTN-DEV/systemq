import { type ReactElement, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, MoreHorizontal, Plus, Settings, Filter, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { PageLayout } from '../../components/PageLayout'
import { StatusIcon, PriorityIcon } from '../../components/IssueIcons'
import { useProduct } from '../../hooks/useProducts'
import { useInitiativeProject, useUpdateInitiativeProject } from '../../hooks/useInitiativeProjects'
import { useCreateIssue, useIssues } from '../../hooks/useIssues'
import { useIssueStatuses } from '../../hooks/useTrackerConfig'

export default function InitiativeProjectDetail(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: project, isLoading } = useInitiativeProject(id!)
  const { data: product } = useProduct(project?.product_id ?? '')
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

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground animate-pulse">
      Loading project details…
    </div>
  )

  if (!project) return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4 text-destructive">
        <ChevronLeft className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold">Project not found</h3>
      <p className="text-sm text-muted-foreground mt-1">The project you are looking for does not exist or has been removed.</p>
      <Button variant="outline" size="sm" onClick={() => navigate('/tracker/products')} className="mt-6">
        Back to Tracker
      </Button>
    </div>
  )

  const breadcrumbs = [
    { label: 'Tracker', href: '/tracker/products' },
    { label: 'Products', href: '/tracker/products' },
    { label: product?.name ?? 'Product', href: `/tracker/products/${project.product_id}` },
    { label: project.key }
  ]

  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <Settings className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <MoreHorizontal className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        className="h-8 gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        onClick={() => setNewIssueOpen(true)}
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Issue</span>
      </Button>
    </div>
  )

  return (
    <PageLayout breadcrumbs={breadcrumbs} actions={actions}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Hero Section */}
        <div className="px-8 py-8 border-b bg-muted/5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <StatusIcon status={project.status} className="w-5 h-5" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{project.key}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Select value={project.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-36 h-8 text-xs bg-muted/50 border-muted-foreground/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(issueStatusConfig?.values.length ? issueStatusConfig.values : ['planned', 'active', 'halted', 'done', 'canceled']).map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {project.description && (
              <p className="text-base text-muted-foreground max-w-2xl leading-relaxed mt-3">
                {project.description}
              </p>
            )}

            <div className="flex items-center gap-6 mt-8 text-xs font-medium text-muted-foreground uppercase tracking-widest">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground/60">Status</span>
                <span className="text-foreground capitalize">{project.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground/60">Product</span>
                <span className="text-foreground">{product?.name ?? project.product_id}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground/60">Issues</span>
                <span className="text-foreground">{issues.length} Total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Issues Header */}
        <div className="px-8 py-3 border-b flex items-center justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-secondary/50 text-xs font-medium text-muted-foreground">
              <Filter className="w-3 h-3" />
              <span>Filter</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-7 text-[11px] border-none bg-transparent hover:bg-muted/50 transition-colors focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {issueStatuses.map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{filteredIssues.length} Issues</span>
          </div>
        </div>

        {/* Issues List */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-border/50">
            {filteredIssues.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center justify-center">
                 <Search className="w-10 h-10 text-muted-foreground/30 mb-4" />
                 <h3 className="text-base font-medium text-muted-foreground">No issues found</h3>
                 <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filters or create a new issue.</p>
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="group flex items-center px-8 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/tracker/issues/${issue.id}`)}
                >
                  <div className="w-12 flex items-center justify-center mr-2">
                    <PriorityIcon priority={issue.priority} />
                  </div>
                  <div className="w-24 font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
                    {project.key}-{issue.id.slice(-4).toUpperCase()}
                  </div>
                  <div className="flex-1 text-sm font-medium tracking-tight truncate mr-4">
                    {issue.title}
                  </div>
                  <div className="w-32 flex items-center gap-2">
                    <StatusIcon status={issue.status} />
                    <span className="text-xs text-muted-foreground capitalize">{issue.status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="w-24 flex items-center justify-end">
                     <div className="w-5 h-5 rounded-full bg-muted border border-background" title="Unassigned" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={newIssueOpen} onOpenChange={setNewIssueOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base">Create new issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</Label>
              <Input
                placeholder="Issue title"
                value={issueForm.title}
                onChange={e => setIssueForm({ ...issueForm, title: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateIssue() }}
                className="h-9 focus-visible:ring-1 focus-visible:ring-ring border-muted-foreground/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                <Select value={issueForm.status} onValueChange={v => setIssueForm({ ...issueForm, status: v })}>
                  <SelectTrigger className="h-9 border-muted-foreground/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {issueStatuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</Label>
                <Select value={String(issueForm.priority)} onValueChange={v => setIssueForm({ ...issueForm, priority: Number(v) })}>
                  <SelectTrigger className="h-9 border-muted-foreground/20">
                    <SelectValue />
                  </SelectTrigger>
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
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setNewIssueOpen(false)} className="h-8">Cancel</Button>
            <Button size="sm" onClick={handleCreateIssue} disabled={createIssue.isPending} className="h-8">
              Create Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

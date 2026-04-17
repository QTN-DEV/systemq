import { type ReactElement, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Filter } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { PageLayout } from '../../components/PageLayout'
import { StatusIcon } from '../../components/IssueIcons'
import { useCreateInitiativeProject, useInitiativeProjects } from '../../hooks/useInitiativeProjects'
import { useInitiatives } from '../../hooks/useInitiatives'

export default function InitiativeProjectList(): ReactElement {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const filterInitiativeId = searchParams.get('initiative_id') ?? undefined

  const { data: projects = [], isLoading } = useInitiativeProjects(filterInitiativeId)
  const { data: initiatives = [] } = useInitiatives()
  const createProject = useCreateInitiativeProject()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ initiative_id: filterInitiativeId ?? '', key: '', name: '', description: '' })

  const initiativeMap = Object.fromEntries(initiatives.map((i) => [i.id, i.name]))

  const handleCreate = async () => {
    if (!form.initiative_id || !form.key.trim() || !form.name.trim()) {
      toast.error('Initiative, key, and name are required')
      return
    }
    try {
      await createProject.mutateAsync({
        initiative_id: form.initiative_id,
        key: form.key.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
      })
      toast.success('Project created')
      setOpen(false)
      setForm({ initiative_id: filterInitiativeId ?? '', key: '', name: '', description: '' })
    } catch {
      toast.error('Failed to create project')
    }
  }

  const breadcrumbs = [
    { label: 'Tracker', href: '/tracker/products' },
    { label: 'Initiative Projects' }
  ]

  if (filterInitiativeId && initiativeMap[filterInitiativeId]) {
    breadcrumbs.push({ label: initiativeMap[filterInitiativeId] })
  }

  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-3 text-muted-foreground hover:text-foreground">
        <Filter className="w-3.5 h-3.5" />
        <span>Filter</span>
      </Button>
      <Button 
        size="sm" 
        onClick={() => setOpen(true)} 
        className="h-8 gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Project</span>
      </Button>
    </div>
  )

  return (
    <PageLayout breadcrumbs={breadcrumbs} actions={actions}>
      <div className="flex flex-col">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="w-16">Key</div>
          <div className="flex-1">Name</div>
          <div className="w-48">Initiative</div>
          <div className="w-32">Status</div>
          <div className="w-32">Target Date</div>
        </div>

        {isLoading ? (
          <div className="p-8 text-sm text-muted-foreground flex items-center justify-center">
            <div className="animate-pulse">Loading projects…</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
             <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
               <Plus className="w-6 h-6" />
             </div>
             <h3 className="text-base font-medium">No projects found</h3>
             <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
               Create your first initiative project to start tracking detailed work.
             </p>
             <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="mt-6 h-8">
               Create Project
             </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group flex items-center px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/tracker/initiative-projects/${p.id}`)}
              >
                <div className="w-16 font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
                  {p.key}
                </div>
                <div className="flex-1 text-sm font-medium tracking-tight">
                  {p.name}
                </div>
                <div className="w-48 text-xs text-muted-foreground truncate pr-4">
                  {initiativeMap[p.initiative_id] ?? p.initiative_id}
                </div>
                <div className="w-32 flex items-center gap-2">
                  <StatusIcon status={p.status} />
                  <span className="text-xs text-muted-foreground capitalize">{p.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="w-32 text-xs text-muted-foreground">
                  {p.target_date ?? 'No target date'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Create new project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Initiative</Label>
              <Select value={form.initiative_id} onValueChange={(v) => setForm({ ...form, initiative_id: v })}>
                <SelectTrigger className="h-9 border-muted-foreground/20">
                  <SelectValue placeholder="Select initiative" />
                </SelectTrigger>
                <SelectContent>
                  {initiatives.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key</Label>
              <Input 
                placeholder="e.g. PROJ-01" 
                value={form.key} 
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="h-9 focus-visible:ring-1 focus-visible:ring-ring border-muted-foreground/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</Label>
              <Input 
                placeholder="Project name" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 focus-visible:ring-1 focus-visible:ring-ring border-muted-foreground/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
              <Input 
                placeholder="Optional description" 
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-9 focus-visible:ring-1 focus-visible:ring-ring border-muted-foreground/20"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-8">Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={createProject.isPending} className="h-8">
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

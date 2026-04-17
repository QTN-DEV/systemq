import { type ReactElement, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { StatusBadge } from '../../components/StatusBadge'
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Execution containers under initiatives</p>
        </div>
        <Button onClick={() => setOpen(true)}>New Project</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {filterInitiativeId ? `Projects — ${initiativeMap[filterInitiativeId] ?? filterInitiativeId}` : 'All Projects'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No projects yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Initiative</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/tracker/initiative-projects/${p.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.key}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{initiativeMap[p.initiative_id] ?? p.initiative_id}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Initiative</Label>
              <Select value={form.initiative_id} onValueChange={(v) => setForm({ ...form, initiative_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select initiative" /></SelectTrigger>
                <SelectContent>
                  {initiatives.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input placeholder="e.g. PROJ-01" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createProject.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

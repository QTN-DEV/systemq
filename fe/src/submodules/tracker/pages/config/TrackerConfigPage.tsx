import { type ReactElement, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, X, Save, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

import { PageLayout } from '../../components/PageLayout'
import { useIssueStatuses, usePlanningStatuses, useUpdateIssueStatuses, useUpdatePlanningStatuses } from '../../hooks/useTrackerConfig'

function StatusListEditor({
  title,
  description,
  values,
  onSave,
  isSaving,
}: {
  title: string
  description: string
  values: string[]
  onSave: (values: string[]) => void
  isSaving: boolean
}): ReactElement {
  const [local, setLocal] = useState<string[]>(values)
  const [newValue, setNewValue] = useState('')

  useEffect(() => { setLocal(values) }, [values])

  const add = () => {
    const v = newValue.trim().toLowerCase().replace(/\s+/g, '_')
    if (!v || local.includes(v)) return
    setLocal([...local, v])
    setNewValue('')
  }

  const remove = (val: string) => setLocal(local.filter((x) => x !== val))

  const isDirty = JSON.stringify(local) !== JSON.stringify(values)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="bg-muted/10 rounded-lg border p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {local.map((val) => (
            <div 
              key={val} 
              className="group flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-md border border-border/50 hover:border-border transition-colors"
            >
              <span className="text-xs font-medium capitalize">{val.replace(/_/g, ' ')}</span>
              <button
                onClick={() => remove(val)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ))}
          {local.length === 0 && (
            <span className="text-xs text-muted-foreground italic">No statuses defined.</span>
          )}
        </div>

        <div className="flex gap-2 max-w-sm">
          <Input
            placeholder="Add status..."
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }}
            className="h-8 text-xs bg-background focus-visible:ring-1"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={add} 
            disabled={!newValue.trim()}
            className="h-8 gap-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </Button>
        </div>

        <div className="pt-2 flex justify-end">
          <Button 
            onClick={() => onSave(local)} 
            disabled={!isDirty || isSaving} 
            size="sm"
            className="h-8 gap-2 px-4 bg-primary/90 hover:bg-primary transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function TrackerConfigPage(): ReactElement {
  const { data: planning } = usePlanningStatuses()
  const { data: issue } = useIssueStatuses()
  const updatePlanning = useUpdatePlanningStatuses()
  const updateIssue = useUpdateIssueStatuses()

  const handleSavePlanning = async (values: string[]) => {
    try {
      await updatePlanning.mutateAsync(values)
      toast.success('Planning statuses updated')
    } catch {
      toast.error('Failed to update planning statuses')
    }
  }

  const handleSaveIssue = async (values: string[]) => {
    try {
      await updateIssue.mutateAsync(values)
      toast.success('Issue statuses updated')
    } catch {
      toast.error('Failed to update issue statuses')
    }
  }

  const breadcrumbs = [
    { label: 'Tracker', href: '/tracker/products' },
    { label: 'Configuration' }
  ]

  const actions = (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
      <Settings className="w-4 h-4" />
    </Button>
  )

  return (
    <PageLayout breadcrumbs={breadcrumbs} actions={actions}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Summary */}
        <div className="px-8 py-6 border-b bg-muted/5">
           <div className="max-w-5xl mx-auto">
              <h1 className="text-2xl font-bold tracking-tight">Tracker Configuration</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage status values and workflow settings used across the Project Management module.
              </p>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-10 px-8 space-y-12">
            <StatusListEditor
              title="Planning Statuses"
              description="States used by high-level containers including Products, Initiatives, and Projects."
              values={planning?.values ?? []}
              onSave={handleSavePlanning}
              isSaving={updatePlanning.isPending}
            />

            <Separator className="opacity-50" />

            <StatusListEditor
              title="Issue Statuses"
              description="Granular workflow states for individual tasks and issues."
              values={issue?.values ?? []}
              onSave={handleSaveIssue}
              isSaving={updateIssue.isPending}
            />

            <div className="pb-20 pt-10 text-center">
               <p className="text-xs text-muted-foreground/60">
                  Changing status names may affect existing filters and dashboards. Use with care.
               </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

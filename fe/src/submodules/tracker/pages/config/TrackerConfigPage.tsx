import { type ReactElement, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 min-h-8">
          {local.map((val) => (
            <Badge key={val} variant="secondary" className="gap-1.5 pr-1 capitalize">
              {val.replace(/_/g, ' ')}
              <button
                onClick={() => remove(val)}
                className="ml-0.5 rounded hover:bg-muted-foreground/20 px-0.5 text-xs leading-none"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add status…"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={add} disabled={!newValue.trim()}>Add</Button>
        </div>

        <Button onClick={() => onSave(local)} disabled={!isDirty || isSaving} size="sm">
          {isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
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

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Tracker Configuration</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage status values used across the tracker</p>
      </div>

      <StatusListEditor
        title="Planning Statuses"
        description="Used by Products, Initiatives, and Projects"
        values={planning?.values ?? []}
        onSave={handleSavePlanning}
        isSaving={updatePlanning.isPending}
      />

      <StatusListEditor
        title="Issue Statuses"
        description="Used by Issues"
        values={issue?.values ?? []}
        onSave={handleSaveIssue}
        isSaving={updateIssue.isPending}
      />
    </div>
  )
}

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  planned:     'bg-slate-100 text-slate-700',
  active:      'bg-blue-100 text-blue-700',
  halted:      'bg-yellow-100 text-yellow-700',
  done:        'bg-green-100 text-green-700',
  canceled:    'bg-red-100 text-red-600',
  triage:      'bg-orange-100 text-orange-700',
  todo:        'bg-slate-100 text-slate-700',
  backlog:     'bg-purple-100 text-purple-700',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review:   'bg-indigo-100 text-indigo-700',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <Badge variant="outline" className={cn('capitalize border-0 font-medium', color, className)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}

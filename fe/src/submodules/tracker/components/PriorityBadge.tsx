import { cn } from '@/lib/utils'
import { PRIORITY_LABELS } from '../types/issue'

const PRIORITY_COLORS: Record<number, string> = {
  0: 'text-red-600',
  1: 'text-orange-500',
  2: 'text-yellow-500',
  3: 'text-slate-500',
  4: 'text-slate-300',
}

interface PriorityBadgeProps {
  priority: number
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span className={cn('text-xs font-medium', PRIORITY_COLORS[priority] ?? 'text-slate-400', className)}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  )
}

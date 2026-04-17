import { type ReactElement, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { 
  ChevronLeft, 
  MoreHorizontal, 
  Settings, 
  Clock, 
  Calendar, 
  Archive, 
  MessageSquare,
  ArrowUpRight,
  Share2
} from 'lucide-react'

import { TipTapEditor } from '@/components/modules/DocumentEditor/TipTapEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/authStore'

import { PageLayout } from '../../components/PageLayout'
import { StatusIcon, PriorityIcon } from '../../components/IssueIcons'
import { useArchiveIssue, useComments, useCreateComment, useEvents, useIssue, useUpdateIssue } from '../../hooks/useIssues'
import { useIssueStatuses } from '../../hooks/useTrackerConfig'
import { PRIORITY_LABELS } from '../../types/issue'

function TimeAgo({ iso }: { iso: string }) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return <>just now</>
  if (mins < 60) return <>{mins}m ago</>
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return <>{hrs}h ago</>
  return <>{Math.floor(hrs / 24)}d ago</>
}

function EventLabel({ eventType, payload }: { eventType: string; payload: Record<string, unknown> }) {
  if (eventType === 'created') return <span>created this issue</span>
  if (eventType === 'status_changed') return (
    <span>
      changed status from <span className="font-medium text-foreground">{String(payload.from)}</span> to <span className="font-medium text-foreground">{String(payload.to)}</span>
    </span>
  )
  if (eventType === 'assigned') return <span>updated assignee</span>
  if (eventType === 'commented') return <span>added a comment</span>
  return <span>{eventType.replace(/_/g, ' ')}</span>
}

export default function IssueDetail(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const { data: issue, isLoading } = useIssue(id!)
  const { data: comments = [] } = useComments(id!)
  const { data: events = [] } = useEvents(id!)
  const { data: issueStatusConfig } = useIssueStatuses()
  const updateIssue = useUpdateIssue()
  const archiveIssue = useArchiveIssue()
  const createComment = useCreateComment(id!)

  const [commentBody, setCommentBody] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  const issueStatuses = issueStatusConfig?.values ?? []

  const handleField = async (field: string, value: unknown) => {
    try {
      await updateIssue.mutateAsync({ id: id!, data: { [field]: value } })
    } catch {
      toast.error(`Failed to update ${field}`)
    }
  }

  const handleSaveDescription = async (html: string) => {
    await handleField('description', html)
  }

  const handleSaveTitle = async () => {
    if (!titleDraft.trim()) return
    await handleField('title', titleDraft.trim())
    setEditingTitle(false)
  }

  const handleSubmitComment = async () => {
    if (!commentBody.trim()) return
    if (!user?.id) { toast.error('Not authenticated'); return }
    try {
      await createComment.mutateAsync({ author_id: user.id, body: commentBody.trim() })
      setCommentBody('')
    } catch {
      toast.error('Failed to post comment')
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground animate-pulse">
      Loading issue details…
    </div>
  )
  
  if (!issue) return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4 text-destructive">
        <ChevronLeft className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold">Issue not found</h3>
      <p className="text-sm text-muted-foreground mt-1">The issue you are looking for does not exist or has been removed.</p>
      <Button variant="outline" size="sm" onClick={() => navigate('/tracker/products')} className="mt-6">
        Back to Tracker
      </Button>
    </div>
  )

  const breadcrumbs = [
    { label: 'Tracker', href: '/tracker/products' },
    { label: 'Issues', href: '/tracker/products' },
    { label: `${issue.id.slice(-6).toUpperCase()}` }
  ]

  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <Share2 className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <Settings className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    </div>
  )

  return (
    <PageLayout breadcrumbs={breadcrumbs} actions={actions}>
      <div className="flex h-full overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-12 py-8 bg-background scrollbar-hide">
          <div className="max-w-3xl">
            {/* Title Section */}
            <div className="mb-8">
              {editingTitle ? (
                <div className="flex flex-col gap-3">
                  <Input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                    className="text-2xl font-bold h-auto py-2 px-3 border-none ring-1 ring-ring focus-visible:ring-1"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingTitle(false)} className="h-7 text-xs">Cancel</Button>
                    <Button size="sm" onClick={handleSaveTitle} className="h-7 text-xs px-4">Save title</Button>
                  </div>
                </div>
              ) : (
                <h1
                  className="text-3xl font-bold tracking-tight cursor-text hover:bg-muted/30 rounded-md -mx-2 px-2 py-1 transition-colors"
                  onClick={() => { setTitleDraft(issue.title); setEditingTitle(true) }}
                >
                  {issue.title}
                </h1>
              )}
            </div>

            {/* Description Editor */}
            <div className="mb-12">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <TipTapEditor
                  initialHtml={issue.description ?? ''}
                  onSave={handleSaveDescription}
                  showToolbar
                />
              </div>
            </div>

            <Separator className="mb-10 opacity-50" />

            {/* Activity & Comments */}
            <div className="space-y-8 pb-20">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Activity & Comments</span>
              </div>

              {/* Event Timeline */}
              <div className="space-y-6">
                {events.map(ev => (
                  <div key={ev.id} className="group relative pl-8">
                    <div className="absolute left-[13px] top-1.5 bottom-[-1.5rem] w-[1px] bg-border group-last:bg-transparent" />
                    <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full bg-background border flex items-center justify-center z-10">
                       <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">{ev.payload.actor_name ?? 'System'}</span>
                        <EventLabel eventType={ev.event_type} payload={ev.payload} />
                        <span className="opacity-60 text-[10px]"><TimeAgo iso={ev.created_at} /></span>
                      </div>
                    </div>
                  </div>
                ))}

                {comments.map(c => (
                  <div key={c.id} className="group relative pl-8">
                    <div className="absolute left-[13px] top-1.5 bottom-[-1.5rem] w-[1px] bg-border group-last:bg-transparent" />
                    <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-muted border flex items-center justify-center z-10 text-[10px] font-bold">
                       {c.author_id.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">{c.author_id.slice(0, 8)}…</span>
                        <span className="opacity-60 text-[10px]"><TimeAgo iso={c.created_at} /></span>
                      </div>
                      <div className="text-sm text-foreground leading-relaxed bg-muted/20 p-3 rounded-lg border border-transparent hover:border-border transition-colors">
                        {c.body}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Comment Input */}
                <div className="relative pl-8 mt-10">
                  <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center z-10 text-[10px] font-bold text-primary">
                    {user?.name?.slice(0, 2).toUpperCase() ?? 'ME'}
                  </div>
                  <div className="space-y-3">
                    <textarea
                      placeholder="Add a comment..."
                      className="w-full min-h-[100px] bg-secondary/30 rounded-lg border-none focus:ring-1 focus:ring-primary/30 p-4 text-sm resize-none transition-all placeholder:text-muted-foreground/50"
                      value={commentBody}
                      onChange={e => setCommentBody(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment() } }}
                    />
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] text-muted-foreground/60 italic">Markdown supported • Command + Enter to post</span>
                       <Button 
                         size="sm" 
                         onClick={handleSubmitComment} 
                         disabled={!commentBody.trim() || createComment.isPending}
                         className="h-8 px-4"
                       >
                         Post comment
                       </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Properties Sidebar */}
        <div className="w-[280px] border-l bg-muted/5 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Status Section */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</Label>
            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
              <StatusIcon status={issue.status} className="w-4 h-4" />
              <Select value={issue.status} onValueChange={v => handleField('status', v)}>
                <SelectTrigger className="h-6 p-0 border-none bg-transparent focus:ring-0 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {issueStatuses.map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority Section */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Priority</Label>
            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
              <PriorityIcon priority={issue.priority} className="w-4 h-4" />
              <Select value={String(issue.priority)} onValueChange={v => handleField('priority', Number(v))}>
                <SelectTrigger className="h-6 p-0 border-none bg-transparent focus:ring-0 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map(p => (
                    <SelectItem key={p} value={String(p)} className="text-xs">
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Metadata Section */}
          <div className="space-y-4">
             <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">Created</span>
                </div>
                <span className="text-[11px] font-medium">{new Date(issue.created_at).toLocaleDateString()}</span>
             </div>

             {issue.closed_at && (
               <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Closed</span>
                  </div>
                  <span className="text-[11px] font-medium">{new Date(issue.closed_at).toLocaleDateString()}</span>
               </div>
             )}

             {issue.initiative_project_id && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium uppercase tracking-wider">Project</span>
                  </div>
                  <button
                    className="text-[11px] font-semibold hover:text-primary transition-colors text-left truncate pl-5"
                    onClick={() => navigate(`/tracker/initiative-projects/${issue.initiative_project_id}`)}
                  >
                    View Project
                  </button>
                </div>
             )}
          </div>

          <div className="mt-auto space-y-3">
             <Separator className="opacity-50" />
             <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8 text-[11px] text-muted-foreground hover:text-foreground"
                disabled={archiveIssue.isPending}
                onClick={() => {
                  const isArchived = !!issue.deleted_at
                  archiveIssue.mutate(
                    { id: id!, archive: !isArchived },
                    { onSuccess: () => toast.success(isArchived ? 'Issue restored' : 'Issue archived') }
                  )
                }}
              >
                <Archive className="w-3.5 h-3.5" />
                {issue.deleted_at ? 'Restore issue' : 'Archive issue'}
              </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

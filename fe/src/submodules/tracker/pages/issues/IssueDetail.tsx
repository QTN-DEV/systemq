import { type ReactElement, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { TipTapEditor } from '@/components/modules/DocumentEditor/TipTapEditor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/authStore'

import { PriorityBadge } from '../../components/PriorityBadge'
import { StatusBadge } from '../../components/StatusBadge'
import { useComments, useCreateComment, useEvents, useIssue, useUpdateIssue } from '../../hooks/useIssues'
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
  if (eventType === 'created') return <>created this issue</>
  if (eventType === 'status_changed') return <>changed status from <Badge variant="outline" className="text-xs">{String(payload.from)}</Badge> to <Badge variant="outline" className="text-xs">{String(payload.to)}</Badge></>
  if (eventType === 'assigned') return <>updated assignee</>
  if (eventType === 'commented') return <>added a comment</>
  return <>{eventType.replace(/_/g, ' ')}</>
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

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  if (!issue) return <div className="p-6 text-sm text-destructive">Issue not found.</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex gap-8">
        {/* Main column */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => navigate('/tracker/initiative-projects')} className="hover:text-foreground">Projects</button>
            {issue.initiative_project_id && (
              <>
                <span>/</span>
                <button
                  onClick={() => navigate(`/tracker/initiative-projects/${issue.initiative_project_id}`)}
                  className="hover:text-foreground"
                >
                  Project
                </button>
              </>
            )}
            <span>/</span>
            <span>Issue</span>
          </div>

          {/* Title */}
          {editingTitle ? (
            <div className="flex gap-2">
              <Input
                ref={titleInputRef}
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                className="text-xl font-semibold h-auto py-1"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveTitle}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingTitle(false)}>Cancel</Button>
            </div>
          ) : (
            <h1
              className="text-2xl font-semibold cursor-pointer hover:text-muted-foreground transition-colors"
              onClick={() => { setTitleDraft(issue.title); setEditingTitle(true) }}
            >
              {issue.title}
            </h1>
          )}

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Description</Label>
            <div className="border rounded-md min-h-32">
              <TipTapEditor
                initialHtml={issue.description ?? ''}
                onSave={handleSaveDescription}
                showToolbar
              />
            </div>
          </div>

          <Separator />

          {/* Comments */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Comments</h3>
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                  {c.author_id.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">{c.author_id.slice(0, 8)}…</span>
                    <span className="text-xs text-muted-foreground"><TimeAgo iso={c.created_at} /></span>
                  </div>
                  <p className="text-sm">{c.body}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
                {user?.name?.slice(0, 2).toUpperCase() ?? 'ME'}
              </div>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Write a comment…"
                  value={commentBody}
                  onChange={e => setCommentBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment() } }}
                />
                <Button size="sm" onClick={handleSubmitComment} disabled={!commentBody.trim() || createComment.isPending}>
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-56 shrink-0 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={issue.status} onValueChange={v => handleField('status', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {issueStatuses.map(s => (
                      <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={String(issue.priority)} onValueChange={v => handleField('priority', Number(v))}>
                  <SelectTrigger className="h-8 text-xs">
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

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="text-xs text-muted-foreground">{new Date(issue.created_at).toLocaleDateString()}</p>
              </div>

              {issue.closed_at && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Closed</Label>
                  <p className="text-xs text-muted-foreground">{new Date(issue.closed_at).toLocaleDateString()}</p>
                </div>
              )}

              {issue.parent_issue_id && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Parent Issue</Label>
                  <button
                    className="text-xs underline text-left"
                    onClick={() => navigate(`/tracker/issues/${issue.parent_issue_id}`)}
                  >
                    View parent
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          {events.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {events.slice(0, 8).map(ev => (
                  <div key={ev.id} className="text-xs text-muted-foreground">
                    <EventLabel eventType={ev.event_type} payload={ev.payload} />
                    <span className="ml-1 opacity-60"><TimeAgo iso={ev.created_at} /></span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

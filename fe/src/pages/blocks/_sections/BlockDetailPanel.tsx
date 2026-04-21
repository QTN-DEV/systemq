import { formatDistanceToNow } from "date-fns";
import { Calendar, Plus, Send, X } from "lucide-react";
import { useMemo, useState, type KeyboardEvent, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime, parseBackendDate } from "@/lib/shared/utils/formatDateTime";
import type { Block } from "@/types/block-type";

import { BlockStatusBadge } from "../_components/BlockStatusBadge";
import { useBlockDetail } from "../_hooks/useBlockDetail";
import { shouldDisplayLevelLabel } from "../_hooks/useBlockLevelConfig";

const FIELD_LABELS: Record<string, string> = {
  status: "status",
  title: "title",
  description: "description",
  deadline: "deadline",
  start_date: "start date",
  parent_id: "parent block",
  assignees: "assignees",
};

type TimelineEntry =
  | {
    id: string;
    type: "history";
    actor: string;
    createdAt: string;
    sortTime: number;
    content: ReactElement;
  }
  | {
    id: string;
    type: "comment";
    actor: string;
    createdAt: string;
    sortTime: number;
    content: ReactElement;
  };

interface Props {
  block: Block;
  currentLevelLabel: string;
  nextLevelLabel: string;
  onClose: () => void;
  onEdit: (block: Block) => void;
  onAddChild: (block: Block) => void;
}

export function BlockDetailPanel({
  block,
  currentLevelLabel,
  nextLevelLabel,
  onClose,
  onEdit,
  onAddChild,
}: Props): ReactElement {
  const { comments, history, loadingComments, loadingHistory, postComment } = useBlockDetail(
    block.id,
    block.updated_at
  );
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendComment = async (): Promise<void> => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      await postComment(commentText.trim());
      setCommentText("");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return "—";
    const date = parseBackendDate(iso);
    return date ? date.toLocaleDateString() : iso;
  };

  const relativeTime = (iso: string): string => {
    const date = parseBackendDate(iso);
    return date ? formatDistanceToNow(date, { addSuffix: true }) : iso;
  };

  const handleCommentKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendComment().catch(() => undefined);
    }
  };

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    const historyEntries = history.map((event) => ({
      id: `history-${event.id}`,
      type: "history" as const,
      actor: event.changed_by_name,
      createdAt: event.changed_at,
      sortTime: parseBackendDate(event.changed_at)?.getTime() ?? 0,
      content: (
        <p className="text-sm text-muted-foreground">
          changed{" "}
          <span className="font-medium text-foreground">{FIELD_LABELS[event.field] ?? event.field}</span>
          {event.old_value && (
            <>
              {" "}
              from <span className="rounded bg-muted px-1 py-0.5 font-mono">{event.old_value}</span>
            </>
          )}{" "}
          to <span className="rounded bg-muted px-1 py-0.5 font-mono">{event.new_value ?? "—"}</span>
        </p>
      ),
    }));

    const commentEntries = comments.map((comment) => ({
      id: `comment-${comment.id}`,
      type: "comment" as const,
      actor: comment.author_name,
      createdAt: comment.created_at,
      sortTime: parseBackendDate(comment.created_at)?.getTime() ?? 0,
      content: (
        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          <p className="whitespace-pre-wrap text-sm text-foreground">{comment.content}</p>
        </div>
      ),
    }));

    return [...historyEntries, ...commentEntries].sort((left, right) => right.sortTime - left.sortTime);
  }, [comments, history]);

  const levelLabel = currentLevelLabel.trim();
  const loadingTimeline = loadingComments || loadingHistory;

  return (
    <div className="flex flex-col h-full border-l bg-background w-80 flex-shrink-0">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{block.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <BlockStatusBadge status={block.status} />
            {shouldDisplayLevelLabel(levelLabel) ? (
              <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {levelLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs"
            onClick={() => onAddChild(block)}
          >
            <Plus className="h-3.5 w-3.5" />
            {nextLevelLabel}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onEdit(block)}>
            Edit
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dates */}
      <div className="px-4 py-2.5 border-b flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(block.start_date)} → {formatDate(block.deadline)}
        </span>
      </div>

      {/* Description */}
      {block.description && (
        <div className="px-4 py-2.5 border-b text-sm text-muted-foreground">
          {block.description}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="flex-1">
          <div className="px-4 py-3">
            {loadingTimeline ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Loading...</p>
            ) : timelineEntries.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No history or comments yet.
              </p>
            ) : (
              <div className="space-y-4">
                {timelineEntries.map((entry, index) => (
                  <div key={entry.id} className="relative pl-5">
                    <span className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-border" />
                    {index < timelineEntries.length - 1 ? (
                      <div className="absolute bottom-[-18px] left-[4px] top-4 w-px bg-border" />
                    ) : null}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{entry.actor}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {relativeTime(entry.createdAt)}
                          </p>
                        </div>
                        <p className="text-right text-[11px] text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                      {entry.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-2">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleCommentKeyDown}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => {
                handleSendComment().catch(() => undefined);
              }}
              disabled={sending || !commentText.trim()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

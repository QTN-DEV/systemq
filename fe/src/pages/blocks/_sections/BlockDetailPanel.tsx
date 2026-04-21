import { formatDistanceToNow } from "date-fns";
import { Calendar, Plus, Send, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime, parseBackendDate } from "@/lib/shared/utils/formatDateTime";
import type { Block, BlockStatus, BlockUpdatePayload } from "@/types/block-type";

import { BlockStatusBadge } from "../_components/BlockStatusBadge";
import { BLOCK_STATUS_OPTIONS } from "../_components/blockUi";
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

const DATE_ONLY_HISTORY_FIELDS = new Set(["start_date", "deadline"]);

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
  onAddChild: (block: Block) => void;
  onUpdate: (blockId: string, payload: BlockUpdatePayload) => Promise<void>;
}

export function BlockDetailPanel({
  block,
  currentLevelLabel,
  nextLevelLabel,
  onClose,
  onAddChild,
  onUpdate,
}: Props): ReactElement {
  const { comments, history, loadingComments, loadingHistory, postComment } = useBlockDetail(block.id);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollHostRef = useRef<HTMLDivElement | null>(null);
  const [titleDraft, setTitleDraft] = useState(block.title);
  const [descriptionDraft, setDescriptionDraft] = useState(block.description ?? "");
  const [startDateDraft, setStartDateDraft] = useState(toDateInputValue(block.start_date));
  const [deadlineDraft, setDeadlineDraft] = useState(toDateInputValue(block.deadline));
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving">("idle");

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

  const relativeTime = (iso: string): string => {
    const date = parseBackendDate(iso);
    return date ? formatDistanceToNow(date, { addSuffix: true }) : iso;
  };

  const formatHistoryValue = (field: string, value: string | null): string => {
    if (!value) return "—";
    if (!DATE_ONLY_HISTORY_FIELDS.has(field)) return value;
    return toDateInputValue(value) || value;
  };

  const handleCommentKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendComment().catch(() => undefined);
    }
  };

  useEffect(() => {
    const nextTitle = block.title;
    const nextDescription = block.description ?? "";
    const nextStartDate = toDateInputValue(block.start_date);
    const nextDeadline = toDateInputValue(block.deadline);

    setTitleDraft(nextTitle);
    setDescriptionDraft(nextDescription);
    setStartDateDraft(nextStartDate);
    setDeadlineDraft(nextDeadline);
    setSaveState("idle");

    if (titleRef.current && titleRef.current.textContent !== nextTitle) {
      titleRef.current.textContent = nextTitle;
    }

    if (descriptionRef.current && descriptionRef.current.textContent !== nextDescription) {
      descriptionRef.current.textContent = nextDescription;
    }
  }, [block.id, block.updated_at, block.title, block.description, block.start_date, block.deadline]);

  const pendingPayload = useMemo<BlockUpdatePayload>(() => {
    const payload: BlockUpdatePayload = {};
    const nextTitle = titleDraft.trim();
    const nextDescription = descriptionDraft.trim() || null;
    const nextStartDate = toUtcMidnightIso(startDateDraft);
    const nextDeadline = toUtcMidnightIso(deadlineDraft);
    const currentTitle = block.title.trim();
    const currentDescription = block.description?.trim() ?? null;
    const currentStartDate = toDateInputValue(block.start_date);
    const currentDeadline = toDateInputValue(block.deadline);

    if (nextTitle && nextTitle !== currentTitle) {
      payload.title = nextTitle;
    }
    if (nextDescription !== currentDescription) {
      payload.description = nextDescription;
    }
    if (startDateDraft !== currentStartDate) {
      payload.start_date = nextStartDate;
    }
    if (deadlineDraft !== currentDeadline) {
      payload.deadline = nextDeadline;
    }

    return payload;
  }, [block.deadline, block.description, block.start_date, block.title, deadlineDraft, descriptionDraft, startDateDraft, titleDraft]);

  useEffect(() => {
    const hasPendingChanges = Object.keys(pendingPayload).length > 0;
    if (!hasPendingChanges) {
      setSaveState("idle");
      return;
    }

    setSaveState("dirty");
    const timeoutId = window.setTimeout(() => {
      setSaveState("saving");
      void onUpdate(block.id, pendingPayload)
        .then(() => {
          setSaveState("idle");
        })
        .catch(() => {
          setSaveState("dirty");
        });
    }, 3000);

    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [block.id, onUpdate, pendingPayload]);

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
              from{" "}
              <span className="rounded bg-muted px-1 py-0.5 font-mono">
                {formatHistoryValue(event.field, event.old_value)}
              </span>
            </>
          )}{" "}
          to{" "}
          <span className="rounded bg-muted px-1 py-0.5 font-mono">
            {formatHistoryValue(event.field, event.new_value)}
          </span>
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

    return [...historyEntries, ...commentEntries].sort((left, right) => left.sortTime - right.sortTime);
  }, [comments, history]);

  const levelLabel = currentLevelLabel.trim();
  const loadingTimeline = loadingComments || loadingHistory;

  useEffect(() => {
    if (loadingTimeline) return;
    const viewport = timelineScrollHostRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [block.id, loadingTimeline, timelineEntries.length]);

  const handleStatusChange = async (status: BlockStatus): Promise<void> => {
    if (status === block.status) return;
    await onUpdate(block.id, { status });
  };

  return (
    <div className="flex flex-col h-full border-l bg-background w-80 flex-shrink-0">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div
            ref={titleRef}
            className="rounded-md px-1 py-0.5 text-sm font-semibold leading-5 outline-none ring-0 transition-shadow focus:bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
            contentEditable
            role="textbox"
            aria-label="Block title"
            suppressContentEditableWarning
            onInput={(event) => {
              setTitleDraft(event.currentTarget.textContent ?? "");
            }}
          />
          <div className="mt-1 flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="rounded-md cursor-pointer">
                  <BlockStatusBadge status={block.status} />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {BLOCK_STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => {
                      void handleStatusChange(option.value);
                    }}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Input
              aria-label="Block start date"
              type="date"
              className="h-8 text-xs"
              value={startDateDraft}
              onChange={(event) => setStartDateDraft(event.target.value)}
            />
          </div>
          <div>
            <Input
              aria-label="Block end date"
              type="date"
              className="h-8 text-xs"
              value={deadlineDraft}
              onChange={(event) => setDeadlineDraft(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="border-b px-2 py-1.5 relative">
        <div
          ref={descriptionRef}
          className="min-h-20 rounded-md border border-transparent px-2 py-1.5 text-sm text-foreground outline-none transition-shadow focus:border-border focus:bg-muted/20 focus-visible:ring-1 focus-visible:ring-ring empty:text-muted-foreground"
          contentEditable
          role="textbox"
          aria-label="Block description"
          suppressContentEditableWarning
          onInput={(event) => {
            setDescriptionDraft(event.currentTarget.textContent ?? "");
          }}
        />
        {descriptionDraft.trim().length === 0 ? (
          <p className="pointer-events-none absolute top-2 left-3 px-2 py-1.5 text-sm text-muted-foreground">
            No Description
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div ref={timelineScrollHostRef} className="min-h-0 flex-1">
          <ScrollArea className="h-full">
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
        </div>

        <div className="shrink-0 border-t px-4 py-2">
          <div className="flex gap-2">
            <Input
              className="h-8 flex-1 text-xs"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleCommentKeyDown}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 flex-shrink-0"
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

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = parseBackendDate(iso);
  return date ? date.toISOString().slice(0, 10) : "";
}

function toUtcMidnightIso(dateValue: string): string | null {
  if (!dateValue) return null;
  return `${dateValue}T00:00:00.000Z`;
}

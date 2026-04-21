import { formatDistanceToNow, parseISO } from "date-fns";
import { Calendar, Send, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Block } from "@/types/block-type";

import { BlockStatusBadge } from "../_components/BlockStatusBadge";
import { useBlockDetail } from "../_hooks/useBlockDetail";

const FIELD_LABELS: Record<string, string> = {
  status: "status",
  title: "title",
  description: "description",
  deadline: "deadline",
  start_date: "start date",
  parent_id: "parent block",
  assignees: "assignees",
};

interface Props {
  block: Block;
  onClose: () => void;
  onEdit: (block: Block) => void;
}

export function BlockDetailPanel({ block, onClose, onEdit }: Props) {
  const { comments, history, loadingComments, loadingHistory, postComment } = useBlockDetail(
    block.id
  );
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      await postComment(commentText.trim());
      setCommentText("");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return parseISO(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const relativeTime = (iso: string) => {
    try {
      return formatDistanceToNow(parseISO(iso), { addSuffix: true });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-background w-80 flex-shrink-0">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{block.title}</p>
          <div className="mt-1">
            <BlockStatusBadge status={block.status} />
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
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

      {/* Tabs: History / Comments */}
      <Tabs defaultValue="history" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="mx-4 mt-2 w-auto self-start h-8">
          <TabsTrigger value="history" className="text-xs h-7">
            History
          </TabsTrigger>
          <TabsTrigger value="comments" className="text-xs h-7">
            Comments {comments.length > 0 && `(${comments.length})`}
          </TabsTrigger>
        </TabsList>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="px-4 py-2 space-y-2">
              {loadingHistory ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading...</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No changes yet.</p>
              ) : (
                history.map((event) => (
                  <div key={event.id} className="text-xs border-l-2 border-border pl-3 py-0.5">
                    <span className="font-medium">{event.changed_by_name}</span>{" "}
                    <span className="text-muted-foreground">
                      changed{" "}
                      <span className="font-medium text-foreground">
                        {FIELD_LABELS[event.field] ?? event.field}
                      </span>
                      {event.old_value && (
                        <>
                          {" "}
                          from{" "}
                          <span className="font-mono bg-muted px-0.5 rounded">
                            {event.old_value}
                          </span>
                        </>
                      )}{" "}
                      →{" "}
                      <span className="font-mono bg-muted px-0.5 rounded">
                        {event.new_value ?? "—"}
                      </span>
                    </span>
                    <p className="text-muted-foreground/60 mt-0.5">{relativeTime(event.changed_at)}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="flex-1 overflow-hidden flex flex-col mt-0">
          <ScrollArea className="flex-1">
            <div className="px-4 py-2 space-y-3">
              {loadingComments ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="text-xs">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-medium">{c.author_name}</span>
                      <span className="text-muted-foreground/60">{relativeTime(c.created_at)}</span>
                    </div>
                    <p className="text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5">
                      {c.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Comment input */}
          <div className="px-4 py-2 border-t flex gap-2">
            <input
              className="flex-1 text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendComment();
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => void handleSendComment()}
              disabled={sending || !commentText.trim()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

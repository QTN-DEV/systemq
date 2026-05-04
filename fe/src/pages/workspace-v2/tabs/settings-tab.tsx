import { type ReactElement, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Brain, Settings2, Loader2, FileText, BookOpen, Save } from "lucide-react";

import {
  deleteWorkspaceContextWorkspaceV2WorkspaceIdContextsContextIdDeleteMutation,
  listWorkspaceContextsWorkspaceV2WorkspaceIdContextsGetOptions,
  listWorkspaceContextsWorkspaceV2WorkspaceIdContextsGetQueryKey,
  getWorkspaceInstructionOptions,
  updateWorkspaceInstructionMutation,
  getWorkspaceInstructionQueryKey,
} from "@/api";
import type { WorkspaceAiContextResponse } from "@/api";
import { PlateEditor, type PlateEditorHandle } from "@/components/editor/plate-editor";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Delete context dialog (isolated popup per guidelines)
// ---------------------------------------------------------------------------

export type DeleteContextDialogProps = {
  contextId: string;
  workspaceId: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
};

export function DeleteContextDialog(props: DeleteContextDialogProps) {
  const { contextId, workspaceId, children, onSuccess } = props;
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    ...deleteWorkspaceContextWorkspaceV2WorkspaceIdContextsContextIdDeleteMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: listWorkspaceContextsWorkspaceV2WorkspaceIdContextsGetQueryKey({
          path: { workspace_id: workspaceId },
        }),
      });
      toast.success("Context deleted");
      setOpen(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error("Failed to delete context");
    },
  });

  const handleConfirm = () => {
    mutate({
      path: { workspace_id: workspaceId, context_id: contextId },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={!!children}>
        {children ?? <Button variant="destructive" size="sm">Delete</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Context</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The context will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Context list content
// ---------------------------------------------------------------------------

type ContextsContentProps = {
  workspaceId: string;
};

function ContextsContent(props: ContextsContentProps) {
  const { workspaceId } = props;

  const { data, isLoading, isError } = useQuery({
    ...listWorkspaceContextsWorkspaceV2WorkspaceIdContextsGetOptions({
      path: { workspace_id: workspaceId },
      query: { page: 1, page_size: 50 },
    }),
    enabled: !!workspaceId,
  });

  const items: WorkspaceAiContextResponse[] = data?.result?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive py-6 text-center text-sm">
        Failed to load contexts.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <FileText className="text-muted-foreground/40 h-8 w-8" />
        <p className="text-muted-foreground text-sm">No contexts yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((ctx) => (
        <li
          key={ctx.id}
          className="bg-muted/40 border-border flex items-start gap-3 rounded-lg border p-3 transition-colors"
        >
          <p className="text-foreground min-w-0 flex-1 break-words text-sm leading-relaxed">
            {ctx.content}
          </p>
          <DeleteContextDialog contextId={ctx.id} workspaceId={workspaceId}>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete context</span>
            </Button>
          </DeleteContextDialog>
        </li>
      ))}
    </ul>
  );
}

function InstructionContent({ workspaceId }: { workspaceId: string }) {
  const plateRef = useRef<PlateEditorHandle>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    ...getWorkspaceInstructionOptions({ path: { workspace_id: workspaceId } }),
    enabled: !!workspaceId,
  });

  const { mutate, isPending } = useMutation({
    ...updateWorkspaceInstructionMutation(),
    onSuccess: () => {
      toast.success("Instructions saved");
      queryClient.invalidateQueries({
        queryKey: getWorkspaceInstructionQueryKey({ path: { workspace_id: workspaceId } }),
      });
    },
    onError: () => toast.error("Failed to save instructions"),
  });

  const handleSave = () => {
    const content = plateRef.current?.getMarkdown() ?? "";
    mutate({ path: { workspace_id: workspaceId }, body: { content } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border border-border rounded-md overflow-hidden bg-background">
      <div className="flex justify-between items-center p-2 border-b border-border bg-muted/20">
        <span className="text-xs font-mono text-muted-foreground ml-2">CLAUDE.md</span>
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Save
        </Button>
      </div>
      <div className="flex-1 min-h-0 relative">
        <PlateEditor
          key={`instruction-${workspaceId}`}
          ref={plateRef}
          initialMarkdown={data?.result?.content ?? ""}
          className="h-full overflow-y-auto"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings nav items
// ---------------------------------------------------------------------------

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "instruction",
    label: "Instructions",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: "context",
    label: "Context",
    icon: <Brain className="h-4 w-4" />,
  },
  {
    id: "general",
    label: "General",
    icon: <Settings2 className="h-4 w-4" />,
  },
];

// ---------------------------------------------------------------------------
// Settings tab root
// ---------------------------------------------------------------------------

export type WorkspaceV2SettingsTabProps = {
  className?: string;
};

export function WorkspaceV2SettingsTab(props: WorkspaceV2SettingsTabProps): ReactElement {
  const { className } = props;
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [activeSection, setActiveSection] = useState<string>("instruction");

  const id = workspaceId?.trim() ?? "";

  return (
    <div className={cn("flex h-full min-h-0 overflow-hidden", className)}>
      {/* Left nav */}
      <aside className="border-border bg-muted/20 flex w-52 shrink-0 flex-col gap-1 border-r p-3">
        <p className="text-muted-foreground mb-1 px-2 text-xs font-semibold uppercase tracking-wider">
          Settings
        </p>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              activeSection === item.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </aside>

      {/* Right content */}
      <main className="min-w-0 flex-1 overflow-y-auto p-6 flex flex-col">
        {activeSection === "instruction" && (
          <section className="flex flex-col flex-1 min-h-0">
            <div className="mb-5 shrink-0">
              <h2 className="text-foreground text-base font-semibold">Workspace Instructions</h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Edit the CLAUDE.md file to define global instructions and behaviors for AI agents in this workspace.
              </p>
            </div>
            {id ? (
              <InstructionContent workspaceId={id} />
            ) : (
              <p className="text-muted-foreground text-sm">No workspace selected.</p>
            )}
          </section>
        )}

        {activeSection === "context" && (
          <section>
            <div className="mb-5">
              <h2 className="text-foreground text-base font-semibold">AI Contexts</h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Manage the context snippets that will be injected into AI conversations for this workspace.
              </p>
            </div>
            {id ? (
              <ContextsContent workspaceId={id} />
            ) : (
              <p className="text-muted-foreground text-sm">No workspace selected.</p>
            )}
          </section>
        )}

        {activeSection === "general" && (
          <section>
            <div className="mb-5">
              <h2 className="text-foreground text-base font-semibold">General</h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                General workspace settings.
              </p>
            </div>
            <p className="text-muted-foreground text-sm">Coming soon.</p>
          </section>
        )}
      </main>
    </div>
  );
}

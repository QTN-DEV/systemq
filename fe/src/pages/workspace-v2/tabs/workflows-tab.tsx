import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  deleteWorkspaceWorkflowWorkspaceV2WorkspaceIdWorkflowsNameDeleteMutation,
  listWorkspaceWorkflowsWorkspaceV2WorkspaceIdWorkflowsGetOptions,
  listWorkspaceWorkflowsWorkspaceV2WorkspaceIdWorkflowsGetQueryKey,
} from "@/api";
import { WorkflowCreateDialog } from "@/components/workspace-v2/workflow-create-dialog";
import { WorkflowExecuteDialog } from "@/components/workspace-v2/workflow-execute-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkspaceV2WorkflowsTabProps = {
  className?: string;
};

export function WorkspaceV2WorkflowsTab(props: WorkspaceV2WorkflowsTabProps) {
  const { className } = props;
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const id = workspaceId?.trim() ?? "";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery({
    ...listWorkspaceWorkflowsWorkspaceV2WorkspaceIdWorkflowsGetOptions({
      path: { workspace_id: id },
    }),
    enabled: id.length > 0,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const workflows = data?.result ?? [];

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: listWorkspaceWorkflowsWorkspaceV2WorkspaceIdWorkflowsGetQueryKey({
        path: { workspace_id: id },
      }),
    });
  };

  useEffect(() => {
    window.addEventListener("focus", invalidate);
    return () => window.removeEventListener("focus", invalidate);
  }, [id, queryClient]);

  const deleteMutation = useMutation({
    ...deleteWorkspaceWorkflowWorkspaceV2WorkspaceIdWorkflowsNameDeleteMutation(),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error("Could not delete workflow");
        return;
      }
      toast.success("Workflow deleted");
      invalidate();
    },
    onError: () => toast.error("Could not delete workflow"),
  });

  if (!workspaceId) return null;

  return (
    <div className={cn("min-h-0 flex-1 overflow-auto p-4 md:p-6 flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <WorkflowCreateDialog
          workspaceId={id}
          onSuccess={(slug) =>
            navigate(`/workspace-v2/${id}/workflows/${encodeURIComponent(slug)}/edit`)
          }
        >
          <Button size="sm" className="h-8" type="button">
            <Plus className="mr-1 h-3.5 w-3.5" />
            New workflow
          </Button>
        </WorkflowCreateDialog>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          type="button"
          onClick={() => void refetch()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Cards */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <GitBranch className="text-muted-foreground/40 h-8 w-8" />
          <p className="text-muted-foreground text-sm">No workflows yet.</p>
          <WorkflowCreateDialog
            workspaceId={id}
            onSuccess={(slug) =>
              navigate(`/workspace-v2/${id}/workflows/${encodeURIComponent(slug)}/edit`)
            }
          >
            <Button size="sm" variant="outline" type="button">
              Create your first workflow
            </Button>
          </WorkflowCreateDialog>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => {
            const editHref = `/workspace-v2/${id}/workflows/${encodeURIComponent(wf.name)}/edit`;
            return (
              <div
                key={wf.name}
                role="button"
                tabIndex={0}
                className="group bg-card border-border flex flex-col gap-2 rounded-lg border p-4 transition-shadow hover:shadow-md cursor-pointer"
                onClick={() => navigate(editHref)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(editHref)}
                aria-label={`Edit workflow ${wf.display_name}`}
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="text-primary h-4 w-4 shrink-0" />
                    <span className="text-foreground truncate text-sm font-medium">
                      {wf.display_name}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    disabled={deleteMutation.isPending}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete workflow "${wf.display_name}"?`)) {
                        deleteMutation.mutate({
                          path: { workspace_id: id, name: wf.name },
                        });
                      }
                    }}
                    aria-label={`Delete workflow ${wf.display_name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Description */}
                {wf.description && (
                  <p className="text-muted-foreground line-clamp-2 text-xs">
                    {wf.description}
                  </p>
                )}

                {/* Footer row */}
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-muted-foreground/60 font-mono text-[10px]">
                    {wf.id}
                  </span>
                  <WorkflowExecuteDialog
                    workspaceId={id}
                    workflowName={wf.name}
                    workflowDisplayName={wf.display_name}
                    onExecute={(values) => {
                      // TODO: wire to actual execution endpoint
                      console.log("Execute workflow", wf.name, "with", values);
                    }}
                  >
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ▶ Run
                    </Button>
                  </WorkflowExecuteDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

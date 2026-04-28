import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type ReactElement } from "react";
import { useNavigate } from "react-router-dom";

import { getWorkspacesWorkspaceV2ListGetOptions } from "@/api";
import { CreateWorkspaceDialog } from "@/components/workspace-v2/create-workspace-dialog";
import { WorkspaceV2ListCard } from "@/components/workspace-v2/workspace-v2-list-card";
import { cn } from "@/lib/utils";

export type WorkspaceV2ListPageProps = {
  className?: string;
};

export default function WorkspaceV2ListPage(props: WorkspaceV2ListPageProps): ReactElement {
  const { className } = props;
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    ...getWorkspacesWorkspaceV2ListGetOptions(),
  });
  const workspaces = data?.result ?? [];

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading workspaces…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workspaces.map((w) => (
              <WorkspaceV2ListCard
                key={w.id}
                name={w.name}
                id={w.id}
                onOpen={() => {
                  navigate(`/workspace-v2/${w.id}/files`);
                }}
              />
            ))}

            <CreateWorkspaceDialog>
              <button
                type="button"
                className="border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/30 flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors"
              >
                <div className="border-muted-foreground/30 flex h-10 w-10 items-center justify-center rounded-lg border border-dashed">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">Add workspace</span>
              </button>
            </CreateWorkspaceDialog>
          </div>
        )}
      </div>
    </div>
  );
}

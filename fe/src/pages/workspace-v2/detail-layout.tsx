import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { type ReactElement, useState } from "react";
import { Link, useNavigate, useParams, useLocation, Outlet } from "react-router-dom";
import { toast } from "sonner";

import {
  deleteWorkspaceWorkspaceV2WorkspaceIdDeleteMutation,
  getWorkspacesWorkspaceV2ListGetQueryKey,
} from "@/api";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { DeleteWorkspaceDialog } from "@/components/workspace-v2/delete-workspace-dialog";
import { cn } from "@/lib/utils";

const tabTriggerClass = (isActive: boolean) =>
  cn(
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
    isActive
      ? "bg-background text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground",
  );

function getActiveTabFromPath(basePath: string, pathname: string): "files" | "skills" | "chat" | "settings" {
  const rest = pathname.slice(basePath.length).replace(/^\/+/, "");
  const first = rest.split("/")[0] || "files";
  if (first === "chat" || first === "settings" || first === "skills") {
    return first;
  }
  return "files";
}

const tabLabel: Record<"files" | "skills" | "chat" | "settings", string> = {
  files: "Files",
  skills: "Skills",
  chat: "Chat",
  settings: "Settings",
};

export type WorkspaceV2DetailLayoutProps = {
  className?: string;
};

export default function WorkspaceV2DetailLayout(props: WorkspaceV2DetailLayoutProps): ReactElement {
  const { className } = props;
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false);
  const id = workspaceId?.trim() ?? "";
  const basePath = id ? `/workspace-v2/${id}` : "/workspace-v2";
  const activeTab = getActiveTabFromPath(basePath, location.pathname);

  const deleteWorkspaceMutation = useMutation({
    ...deleteWorkspaceWorkspaceV2WorkspaceIdDeleteMutation(),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error("Could not delete workspace");
        return;
      }
      toast.success("Workspace deleted");
      setDeleteWorkspaceOpen(false);
      void queryClient.invalidateQueries({ queryKey: getWorkspacesWorkspaceV2ListGetQueryKey() });
      navigate("/workspace-v2");
    },
    onError: () => {
      toast.error("Could not delete workspace");
    },
  });

  if (!workspaceId) {
    return (
      <div className={cn("p-6", className)}>
        <p className="text-muted-foreground text-sm">Missing workspace.</p>
        <Link to="/workspace-v2" className="text-primary mt-2 inline-block text-sm underline">
          Back to workspaces (v2)
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex flex-shrink-0 flex-col gap-2 border-b bg-background px-4 py-2.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/workspace-v2">Workspaces (v2)</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0 max-w-full">
                <BreadcrumbLink asChild>
                  <Link to={`${basePath}/files`} className="min-w-0 truncate" title={id}>
                    {id}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{tabLabel[activeTab]}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <DeleteWorkspaceDialog
            open={deleteWorkspaceOpen}
            onOpenChange={setDeleteWorkspaceOpen}
            isPending={deleteWorkspaceMutation.isPending}
            onConfirm={() => {
              deleteWorkspaceMutation.mutate({ path: { workspace_id: id } });
            }}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DeleteWorkspaceDialog>
        </div>
        <nav className="bg-muted/60 flex w-fit max-w-full flex-wrap gap-0.5 rounded-lg p-1" aria-label="Workspace sections">
          <Link to={`${basePath}/files`} className={tabTriggerClass(activeTab === "files")}>
            Files
          </Link>
          <Link to={`${basePath}/skills`} className={tabTriggerClass(activeTab === "skills")}>
            Skills
          </Link>
          <Link to={`${basePath}/chat`} className={tabTriggerClass(activeTab === "chat")}>
            Chat
          </Link>
          <Link to={`${basePath}/settings`} className={tabTriggerClass(activeTab === "settings")}>
            Settings
          </Link>
        </nav>
      </div>

      <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

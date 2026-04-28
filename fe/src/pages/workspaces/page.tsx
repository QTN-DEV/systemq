import { FolderOpen, Plus } from "lucide-react";
import { type ReactElement, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace, listWorkspaces } from "@/lib/shared/services/WorkspaceService";
import type { Workspace } from "@/types/workspace";

export default function WorkspacesPage(): ReactElement {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");

  const loadWorkspaces = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await listWorkspaces();
      setWorkspaces(data);
    } catch {
      toast.error("Failed to load workspaces");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const handleCreateWorkspace = async (): Promise<void> => {
    const name = newWsName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    try {
      const ws = await createWorkspace(name);
      toast.success("Workspace created");
      setCreateWsOpen(false);
      setNewWsName("");
      await loadWorkspaces();
      navigate(`/workspaces/${ws.id}`);
    } catch {
      toast.error("Could not create workspace");
    }
  };

  const goToWorkspace = (id: string): void => {
    navigate(`/workspaces/${id}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center border-b bg-background px-4 py-2.5">
        <h1 className="text-base font-semibold">Workspaces</h1>
        <p className="text-muted-foreground ml-3 text-sm">Open a workspace to manage files and skills.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        {loadingList ? (
          <p className="text-muted-foreground text-sm">Loading workspaces…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workspaces.map((w) => (
              <Card
                key={w.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  goToWorkspace(w.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToWorkspace(w.id);
                  }
                }}
                className="cursor-pointer py-5 transition-shadow hover:shadow-md focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
              >
                <CardHeader className="gap-3">
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                    <FolderOpen className="text-muted-foreground h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="line-clamp-2 text-base leading-snug">{w.name}</CardTitle>
                    <CardDescription className="font-mono text-[11px] break-all">{w.id}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}

            <button
              type="button"
              onClick={() => setCreateWsOpen(true)}
              className="border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/30 flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors"
            >
              <div className="border-muted-foreground/30 flex h-10 w-10 items-center justify-center rounded-lg border border-dashed">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Add workspace</span>
            </button>
          </div>
        )}
      </div>

      <Dialog open={createWsOpen} onOpenChange={setCreateWsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ws-name">Name</Label>
            <Input
              id="ws-name"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="My workspace"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateWorkspace().catch(() => {});
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateWsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleCreateWorkspace().catch(() => {});
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

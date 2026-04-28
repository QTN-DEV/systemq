import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  createWorkspaceSkillWorkspaceV2WorkspaceIdSkillsPostMutation,
  deleteWorkspaceSkillWorkspaceV2WorkspaceIdSkillsNameDeleteMutation,
  getWorkspaceFilesWorkspaceV2WorkspaceIdFilesGetOptions,
  getWorkspaceFilesWorkspaceV2WorkspaceIdFilesGetQueryKey,
} from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";

function encodeFilePathForUrl(relativePath: string): string {
  return relativePath.split("/").map((p) => encodeURIComponent(p)).join("/");
}

export type WorkspaceV2SkillsTabProps = {
  className?: string;
};

export function WorkspaceV2SkillsTab(props: WorkspaceV2SkillsTabProps) {
  const { className } = props;
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const id = workspaceId?.trim() ?? "";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [skillNameInput, setSkillNameInput] = useState("");

  const { data, isLoading, refetch } = useQuery({
    ...getWorkspaceFilesWorkspaceV2WorkspaceIdFilesGetOptions({
      path: { workspace_id: id },
      query: { in: ".claude/skills" },
    }),
    enabled: id.length > 0,
    retry: false, // Don't retry since it might 404 if directory doesn't exist
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const skillsEntries = data?.result?.filter((e) => e.is_folder) ?? [];

  const invalidateSkills = () => {
    void queryClient.invalidateQueries({
      queryKey: getWorkspaceFilesWorkspaceV2WorkspaceIdFilesGetQueryKey({
        path: { workspace_id: id },
        query: { in: ".claude/skills" },
      }),
    });
  };

  useEffect(() => {
    window.addEventListener("focus", invalidateSkills);
    return () => window.removeEventListener("focus", invalidateSkills);
  }, [id, queryClient]);

  const createSkillMutation = useMutation({
    ...createWorkspaceSkillWorkspaceV2WorkspaceIdSkillsPostMutation(),
    onSuccess: (res, variables) => {
      if (!res.success) {
        toast.error("Could not create skill");
        return;
      }
      toast.success("Skill created");
      setSkillDialogOpen(false);
      invalidateSkills();
      navigate(`/workspace-v2/${id}/files/edit/${encodeFilePathForUrl(`.claude/skills/${variables.body.name}/SKILL.md`)}`);
    },
    onError: () => toast.error("Could not create skill"),
  });

  const deleteSkillMutation = useMutation({
    ...deleteWorkspaceSkillWorkspaceV2WorkspaceIdSkillsNameDeleteMutation(),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error("Could not delete skill");
        return;
      }
      toast.success("Skill deleted");
      invalidateSkills();
    },
    onError: () => toast.error("Could not delete skill"),
  });

  const openSkillDialog = () => {
    setSkillNameInput("");
    setSkillDialogOpen(true);
  };

  const saveSkill = () => {
    const name = skillNameInput.trim();
    if (!name) {
      toast.error("Skill name is required");
      return;
    }
    createSkillMutation.mutate({
      path: { workspace_id: id },
      body: { name, content: "# New Skill" },
    });
  };

  const isSaving = createSkillMutation.isPending;

  if (!workspaceId) return null;

  return (
    <div className={cn("min-h-0 flex-1 overflow-auto p-4 md:p-6 flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-8" onClick={openSkillDialog}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          New skill
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={() => void refetch()}>
          Refresh
        </Button>
      </div>
      <ScrollArea className="min-h-[280px] flex-1 rounded-md border">
        <div className="p-2">
          {isLoading ? (
            <p className="text-muted-foreground p-4 text-sm">Loading…</p>
          ) : skillsEntries.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">No skills yet.</p>
          ) : (
            <ul className="space-y-1">
              {skillsEntries.map((e) => (
                <li
                  key={e.path}
                  className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <FileIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{e.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    asChild
                  >
                    <Link to={`/workspace-v2/${id}/files/edit/${encodeFilePathForUrl(`.claude/skills/${e.name}/SKILL.md`)}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive h-8 w-8 shrink-0"
                    disabled={deleteSkillMutation.isPending}
                    onClick={() => {
                      if (confirm(`Delete skill ${e.name}?`)) {
                        deleteSkillMutation.mutate({
                          path: { workspace_id: id, name: e.name },
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>

      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New skill</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Name</Label>
              <Input
                id="skill-name"
                value={skillNameInput}
                onChange={(e) => setSkillNameInput(e.target.value)}
                disabled={isSaving}
                placeholder="my-skill"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={saveSkill} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

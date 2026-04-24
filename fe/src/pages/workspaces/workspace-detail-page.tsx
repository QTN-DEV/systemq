import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceAssistantThread } from "@/components/chat/workspace-assistant-thread";
import { useWorkspaceChatAdapter } from "@/hooks/use-workspace-chat-adapter";
import {
  createSkill,
  createWorkspacePath,
  deleteSkill,
  deleteWorkspace,
  getSkill,
  listWorkspaceFiles,
  listWorkspaces,
  updateSkill,
  uploadWorkspaceFile,
} from "@/lib/shared/services/WorkspaceService";
import type { Workspace, WorkspaceFileEntry, WorkspaceFilesResponse } from "@/types/workspace";
import { ArrowLeft, ArrowUp, FileIcon, FolderIcon, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

function pathLabel(browseIn: string | null): string {
  if (browseIn === null) {
    return "data";
  }
  if (browseIn === "") {
    return "Workspace root";
  }
  return browseIn;
}

function WorkspaceChatSection({ workspaceId }: { workspaceId: string }): ReactElement {
  const runtime = useWorkspaceChatAdapter(workspaceId);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
      <WorkspaceAssistantThread runtime={runtime} workspaceId={workspaceId} />
    </div>
  );
}

export default function WorkspaceDetailPage(): ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [workspaceMeta, setWorkspaceMeta] = useState<Workspace | null>(null);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [browseIn, setBrowseIn] = useState<string | null>(null);
  const [files, setFiles] = useState<WorkspaceFilesResponse | null>(null);
  const [skillsEntries, setSkillsEntries] = useState<WorkspaceFileEntry[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [mainTab, setMainTab] = useState<"files" | "skills" | "chat">("files");

  const [deleteWsOpen, setDeleteWsOpen] = useState(false);

  const [newPathOpen, setNewPathOpen] = useState(false);
  const [newPathValue, setNewPathValue] = useState("");
  const [newPathIsFolder, setNewPathIsFolder] = useState(true);

  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [skillEditingName, setSkillEditingName] = useState<string | null>(null);
  const [skillNameInput, setSkillNameInput] = useState("");
  const [skillContent, setSkillContent] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedId = workspaceId ?? "";

  const loadMeta = useCallback(async () => {
    if (!selectedId) {
      setWorkspaceMeta(null);
      setMetaLoaded(true);
      return;
    }
    try {
      const data = await listWorkspaces();
      setWorkspaceMeta(data.find((w) => w.id === selectedId) ?? null);
    } catch {
      toast.error("Failed to load workspace");
      setWorkspaceMeta(null);
    } finally {
      setMetaLoaded(true);
    }
  }, [selectedId]);

  const loadFiles = useCallback(async () => {
    if (!selectedId) {
      setFiles(null);
      return;
    }
    setLoadingFiles(true);
    try {
      const data = await listWorkspaceFiles(selectedId, browseIn);
      setFiles(data);
    } catch {
      toast.error("Failed to load files");
      setFiles(null);
    } finally {
      setLoadingFiles(false);
    }
  }, [selectedId, browseIn]);

  const loadSkillsDir = useCallback(async () => {
    if (!selectedId) {
      setSkillsEntries([]);
      return;
    }
    setLoadingSkills(true);
    try {
      const data = await listWorkspaceFiles(selectedId, ".claude/skills");
      setSkillsEntries(data.result.filter((e) => !e.isFolder));
    } catch {
      toast.error("Failed to load skills");
      setSkillsEntries([]);
    } finally {
      setLoadingSkills(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (mainTab === "skills") {
      void loadSkillsDir();
    }
  }, [mainTab, loadSkillsDir]);

  useEffect(() => {
    setBrowseIn(null);
  }, [selectedId]);

  const handleDeleteWorkspace = async (): Promise<void> => {
    if (!selectedId) {
      return;
    }
    try {
      await deleteWorkspace(selectedId);
      toast.success("Workspace deleted");
      setDeleteWsOpen(false);
      navigate("/workspaces");
    } catch {
      toast.error("Could not delete workspace");
    }
  };

  const handleUp = (): void => {
    if (!files || files.previous === null) {
      return;
    }
    setBrowseIn(files.previous === "" ? "" : files.previous);
  };

  const openNewPath = (isFolder: boolean): void => {
    setNewPathIsFolder(isFolder);
    setNewPathValue("");
    setNewPathOpen(true);
  };

  const submitNewPath = async (): Promise<void> => {
    const p = newPathValue.trim().replace(/^\/+/, "");
    if (!p || !selectedId) {
      toast.error("Path is required");
      return;
    }
    const base = browseIn === null ? null : browseIn.replace(/\/+$/, "");
    const relativePath =
      base === null || base === "" ? p : `${base}/${p}`;
    try {
      await createWorkspacePath(selectedId, relativePath, newPathIsFolder);
      toast.success(newPathIsFolder ? "Folder created" : "File created");
      setNewPathOpen(false);
      await loadFiles();
    } catch {
      toast.error("Could not create path");
    }
  };

  const onPickUpload = (): void => {
    fileInputRef.current?.click();
  };

  const onUploadChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedId) {
      return;
    }
    try {
      await uploadWorkspaceFile(selectedId, file, null);
      toast.success("Uploaded");
      await loadFiles();
    } catch {
      toast.error("Upload failed");
    }
  };

  const openSkillDialog = async (name: string | null): Promise<void> => {
    if (!selectedId) {
      return;
    }
    setSkillEditingName(name);
    if (name) {
      try {
        const s = await getSkill(selectedId, name);
        setSkillNameInput(s.name);
        setSkillContent(s.content);
      } catch {
        toast.error("Could not load skill");
        return;
      }
    } else {
      setSkillNameInput("");
      setSkillContent("");
    }
    setSkillDialogOpen(true);
  };

  const saveSkill = async (): Promise<void> => {
    if (!selectedId) {
      return;
    }
    const name = skillNameInput.trim();
    if (!name) {
      toast.error("Skill name is required");
      return;
    }
    try {
      if (skillEditingName !== null) {
        await updateSkill(selectedId, skillEditingName, skillContent);
        toast.success("Skill updated");
      } else {
        await createSkill(selectedId, name, skillContent);
        toast.success("Skill created");
      }
      setSkillDialogOpen(false);
      await loadSkillsDir();
    } catch {
      toast.error("Could not save skill");
    }
  };

  const removeSkill = async (name: string): Promise<void> => {
    if (!selectedId) {
      return;
    }
    try {
      await deleteSkill(selectedId, name);
      toast.success("Skill removed");
      await loadSkillsDir();
    } catch {
      toast.error("Could not delete skill");
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8">
        <p className="text-muted-foreground text-sm">Missing workspace.</p>
        <Button variant="outline" asChild>
          <Link to="/workspaces">Back to workspaces</Link>
        </Button>
      </div>
    );
  }

  if (metaLoaded && workspaceMeta === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
        <p className="text-muted-foreground text-sm">This workspace was not found or you don&apos;t have access.</p>
        <Button variant="outline" asChild>
          <Link to="/workspaces">Back to workspaces</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b bg-background px-4 py-2.5">
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" asChild>
          <Link to="/workspaces">
            <ArrowLeft className="h-3.5 w-3.5" />
            Workspaces
          </Link>
        </Button>
        <h1 className="text-base font-semibold">
          {workspaceMeta?.name ?? "Workspace"}
        </h1>
        <span className="text-muted-foreground font-mono text-[11px]">{workspaceId}</span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="destructive"
          className="h-8"
          onClick={() => setDeleteWsOpen(true)}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Delete workspace
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <Tabs
          value={mainTab}
          onValueChange={(v) => setMainTab(v as "files" | "skills" | "chat")}
          className="flex min-h-0 flex-1 flex-col gap-3"
        >
          <TabsList>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="files" className="mt-0 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">
                Path: <span className="text-foreground font-medium">{pathLabel(browseIn)}</span>
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={!files || files.previous === null || loadingFiles}
                onClick={handleUp}
              >
                <ArrowUp className="mr-1 h-3.5 w-3.5" />
                Up
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => openNewPath(true)}>
                <FolderIcon className="mr-1 h-3.5 w-3.5" />
                New folder
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => openNewPath(false)}>
                <FileIcon className="mr-1 h-3.5 w-3.5" />
                New file
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={onPickUpload}>
                <Upload className="mr-1 h-3.5 w-3.5" />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => void onUploadChange(e)}
              />
            </div>
            <ScrollArea className="min-h-[280px] flex-1 rounded-md border">
              <div className="p-2">
                {loadingFiles ? (
                  <p className="text-muted-foreground p-4 text-sm">Loading…</p>
                ) : !files?.result.length ? (
                  <p className="text-muted-foreground p-4 text-sm">This folder is empty.</p>
                ) : (
                  <ul className="space-y-1">
                    {files.result.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          disabled={!entry.isFolder}
                          onClick={() => entry.isFolder && setBrowseIn(entry.id)}
                          className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm disabled:cursor-default disabled:opacity-60"
                        >
                          {entry.isFolder ? (
                            <FolderIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                          ) : (
                            <FileIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                          )}
                          <span className="min-w-0 truncate">{entry.name}</span>
                          <span className="text-muted-foreground ml-auto shrink-0 text-xs">{entry.mimeType}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="skills" className="mt-0 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-8" onClick={() => void openSkillDialog(null)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                New skill
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => void loadSkillsDir()}>
                Refresh
              </Button>
            </div>
            <ScrollArea className="min-h-[280px] flex-1 rounded-md border">
              <div className="p-2">
                {loadingSkills ? (
                  <p className="text-muted-foreground p-4 text-sm">Loading…</p>
                ) : skillsEntries.length === 0 ? (
                  <p className="text-muted-foreground p-4 text-sm">No skills yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {skillsEntries.map((e) => (
                      <li
                        key={e.id}
                        className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                      >
                        <FileIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{e.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={() => void openSkillDialog(e.name)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive h-8 w-8 shrink-0"
                          onClick={() => void removeSkill(e.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <p className="text-muted-foreground text-xs">
              Assistant runs with this workspace folder as its working directory (see <code className="text-foreground">data/</code>,{" "}
              <code className="text-foreground">outputs/</code>, skills).
            </p>
            <WorkspaceChatSection workspaceId={workspaceId} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={newPathOpen} onOpenChange={setNewPathOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newPathIsFolder ? "New folder" : "New file"}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-xs">
            Relative path; <code className="text-foreground">data/</code> is added when no root prefix is given (e.g.{" "}
            <code className="text-foreground">notes</code> → <code className="text-foreground">data/notes</code>).
          </p>
          <div className="space-y-2">
            <Label htmlFor="path-input">Path</Label>
            <Input
              id="path-input"
              value={newPathValue}
              onChange={(e) => setNewPathValue(e.target.value)}
              placeholder="notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPathOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitNewPath()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{skillEditingName ? "Edit skill" : "New skill"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Name</Label>
              <Input
                id="skill-name"
                value={skillNameInput}
                onChange={(e) => setSkillNameInput(e.target.value)}
                disabled={!!skillEditingName}
                placeholder="my-skill"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-body">Markdown</Label>
              <Textarea
                id="skill-body"
                value={skillContent}
                onChange={(e) => setSkillContent(e.target.value)}
                rows={12}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveSkill()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteWsOpen} onOpenChange={setDeleteWsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all files on disk for this workspace and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteWorkspace()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { type ReactElement, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  getWorkspaceFileWorkspaceV2WorkspaceIdFilesFilePathGet,
  getWorkspaceFileWorkspaceV2WorkspaceIdFilesFilePathGetQueryKey,
  getWorkspaceTreeWorkspaceV2WorkspaceIdTreeGetQueryKey,
  updateWorkspaceFileWorkspaceV2WorkspaceIdFilesFilePathPut,
} from "@/api";
import { PlateEditor, type PlateEditorHandle } from "@/components/editor/plate-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkspaceV2MarkdownEditPageProps = {
  className?: string;
};

type EditorMode = "plate" | "raw";

function decodeSplatToFilePath(splat: string | undefined): string {
  if (!splat) {
    return "";
  }
  return splat
    .replace(/^\/+/, "")
    .split("/")
    .map((s) => decodeURIComponent(s))
    .join("/");
}

export default function WorkspaceV2MarkdownEditPage(props: WorkspaceV2MarkdownEditPageProps): ReactElement {
  const { className } = props;
  const { workspaceId, "*": splatPath } = useParams<{ workspaceId: string; "*": string | undefined }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewOnly = searchParams.get("mode") === "view";
  const queryClient = useQueryClient();
  const plateRef = useRef<PlateEditorHandle>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("plate");
  const [rawValue, setRawValue] = useState<string | undefined>(undefined);

  const filePath = decodeSplatToFilePath(splatPath);
  const wsId = workspaceId?.trim() ?? "";
  const isMd = filePath.toLowerCase().endsWith(".md");
  const canLoad = Boolean(wsId && filePath && isMd);

  const { data: markdown, isLoading: loading, isError: loadError } = useQuery({
    queryKey: canLoad
      ? getWorkspaceFileWorkspaceV2WorkspaceIdFilesFilePathGetQueryKey({
          path: { workspace_id: wsId, file_path: filePath },
        })
      : ["getWorkspaceV2File", "disabled"],
    queryFn: async () => {
      const { data } = await getWorkspaceFileWorkspaceV2WorkspaceIdFilesFilePathGet({
        path: { workspace_id: wsId, file_path: filePath },
        parseAs: "text",
        throwOnError: true,
      });
      if (data === undefined || data === null) {
        return "";
      }
      if (typeof data === "string") {
        return data;
      }
      if (data instanceof Blob) {
        return data.text();
      }
      return String(data);
    },
    enabled: canLoad,
  });

  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      await updateWorkspaceFileWorkspaceV2WorkspaceIdFilesFilePathPut({
        path: { workspace_id: wsId, file_path: filePath },
        body: new Blob([content], { type: "application/octet-stream" }),
        throwOnError: true,
      });
    },
    onSuccess: () => {
      toast.success("File saved");
      void queryClient.invalidateQueries({
        queryKey: getWorkspaceFileWorkspaceV2WorkspaceIdFilesFilePathGetQueryKey({
          path: { workspace_id: wsId, file_path: filePath },
        }),
      });
      void queryClient.invalidateQueries({
        queryKey: getWorkspaceTreeWorkspaceV2WorkspaceIdTreeGetQueryKey({
          path: { workspace_id: wsId },
        }),
      });
      navigate(`/workspace-v2/${wsId}/files`);
    },
    onError: () => {
      toast.error("Could not save file");
    },
  });

  const save = (): void => {
    if (!wsId || !filePath) {
      return;
    }
    const md =
      editorMode === "raw"
        ? (rawValue ?? markdown ?? "")
        : (plateRef.current?.getMarkdown() ?? markdown ?? "");
    saveMutation.mutate(md);
  };

  const handleSwitchMode = (mode: EditorMode) => {
    if (mode === editorMode) return;
    // Sync content from the current editor before switching
    if (editorMode === "plate" && mode === "raw") {
      const currentMd = plateRef.current?.getMarkdown() ?? markdown ?? "";
      setRawValue(currentMd);
    } else if (editorMode === "raw" && mode === "plate") {
      // raw → plate: rawValue will be passed as new initialMarkdown via key
      // PlateEditor will re-initialise with rawValue
    }
    setEditorMode(mode);
  };

  const backHref = wsId ? `/workspace-v2/${wsId}/files` : "/workspace-v2";

  if (!workspaceId) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center gap-2 p-8", className)}>
        <p className="text-muted-foreground text-sm">Missing workspace.</p>
        <Button variant="outline" asChild>
          <Link to="/workspace-v2">Back to workspaces (v2)</Link>
        </Button>
      </div>
    );
  }

  if (!filePath) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center gap-3 p-8", className)}>
        <p className="text-muted-foreground text-sm">No file path in the URL.</p>
        <Button variant="outline" asChild>
          <Link to={backHref}>Back</Link>
        </Button>
      </div>
    );
  }

  if (!isMd) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center gap-3 p-8", className)}>
        <p className="text-muted-foreground text-sm">Only Markdown (`.md`) files can be edited here.</p>
        <Button variant="outline" asChild>
          <Link to={backHref}>Back</Link>
        </Button>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center gap-3 p-8", className)}>
        <p className="text-muted-foreground text-sm">Could not load file.</p>
        <Button variant="outline" asChild>
          <Link to={backHref}>Back</Link>
        </Button>
      </div>
    );
  }

  const activeMd = rawValue !== undefined ? rawValue : (markdown ?? "");

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {/* Toolbar */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b bg-background px-4 py-2.5">
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" asChild>
          <Link to={backHref}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Workspace
          </Link>
        </Button>
        <h1 className="text-base font-semibold">{viewOnly ? "View Markdown" : "Edit Markdown"}</h1>
        <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px]" title={filePath}>
          {filePath}
        </span>

        {/* Mode switcher */}
        {!viewOnly && (
          <div className="flex items-center rounded-md border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => handleSwitchMode("plate")}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                editorMode === "plate"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode("raw")}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                editorMode === "raw"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Raw
            </button>
          </div>
        )}

        {viewOnly ? null : (
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={Boolean(loading) || saveMutation.isPending}
            onClick={() => {
              save();
            }}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        )}
      </div>

      {/* Editor area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <p className="text-muted-foreground p-4 text-sm">Loading…</p>
        ) : editorMode === "raw" ? (
          <textarea
            className="h-full w-full min-h-0 flex-1 resize-none bg-background p-4 font-mono text-sm text-foreground outline-none"
            value={rawValue ?? activeMd}
            onChange={(e) => setRawValue(e.target.value)}
            readOnly={viewOnly}
            spellCheck={false}
          />
        ) : (
          <PlateEditor
            key={`${filePath}-${editorMode}-${activeMd.slice(0, 32)}`}
            ref={plateRef}
            className="min-h-0 flex-1"
            initialMarkdown={activeMd}
            readOnly={viewOnly}
          />
        )}
      </div>
    </div>
  );
}

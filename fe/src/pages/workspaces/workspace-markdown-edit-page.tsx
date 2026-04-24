import { ArrowLeft } from "lucide-react";
import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  PlateEditor,
  type PlateEditorHandle,
} from "@/components/editor/plate-editor";
import { Button } from "@/components/ui/button";
import {
  getWorkspaceMarkdownFile,
  updateWorkspaceMarkdownFile,
} from "@/lib/shared/services/WorkspaceService";

export default function WorkspaceMarkdownEditPage(): ReactElement {
  const { workspaceId, "*": splatPath } = useParams<{ workspaceId: string; "*": string | undefined }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewOnly = searchParams.get("mode") === "view";
  const filePath = (splatPath ?? "").replace(/^\/+/, "");

  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const plateRef = useRef<PlateEditorHandle>(null);

  const wsId = workspaceId ?? "";
  const isMd = filePath.toLowerCase().endsWith(".md");

  const load = useCallback(async () => {
    if (!wsId || !filePath || !isMd) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getWorkspaceMarkdownFile(wsId, filePath);
      setMarkdown(data.content);
    } catch {
      toast.error("Could not load file");
      setMarkdown("");
    } finally {
      setLoading(false);
    }
  }, [wsId, filePath, isMd]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (): Promise<void> => {
    if (!wsId || !filePath) {
      return;
    }
    const md = plateRef.current?.getMarkdown() ?? markdown;
    setSaving(true);
    try {
      await updateWorkspaceMarkdownFile(wsId, filePath, md);
      toast.success("File saved");
      navigate(`/workspaces/${wsId}`);
    } catch {
      toast.error("Could not save file");
    } finally {
      setSaving(false);
    }
  };

  const backHref = wsId ? `/workspaces/${wsId}` : "/workspaces";

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

  if (!filePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
        <p className="text-muted-foreground text-sm">No file path in the URL.</p>
        <Button variant="outline" asChild>
          <Link to={backHref}>Back</Link>
        </Button>
      </div>
    );
  }

  if (!isMd) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
        <p className="text-muted-foreground text-sm">Only Markdown (`.md`) files can be edited here.</p>
        <Button variant="outline" asChild>
          <Link to={backHref}>Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
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
        {viewOnly ? null : (
          <Button
            size="sm"
            className="h-8"
            disabled={loading || saving}
            onClick={() => {
              void save();
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <PlateEditor
            key={filePath}
            ref={plateRef}
            className="min-h-0 flex-1"
            initialMarkdown={markdown}
            readOnly={viewOnly}
          />
        )}
      </div>
    </div>
  );
}

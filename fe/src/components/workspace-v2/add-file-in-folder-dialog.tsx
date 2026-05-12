import { type ReactElement, useEffect, useState } from "react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type AddFileInFolderDialogProps = {
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderRelativePath: string;
  isSubmitting: boolean;
  onCreateMarkdown: (fileName: string) => void;
  onUpload: (file: File) => void;
};

function normalizeFileName(name: string): string {
  return name.replace(/[\\/]+/g, "").trim();
}

function ensureMdExtension(name: string): string {
  const b = normalizeFileName(name);
  if (!b) {
    return "";
  }
  return b.toLowerCase().endsWith(".md") ? b : `${b}.md`;
}

export function AddFileInFolderDialog(props: AddFileInFolderDialogProps): ReactElement {
  const {
    className,
    open,
    onOpenChange,
    folderRelativePath,
    isSubmitting,
    onCreateMarkdown,
    onUpload,
  } = props;
  const [tab, setTab] = useState<"markdown" | "upload">("markdown");
  const [nameValue, setNameValue] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setTab("markdown");
      setNameValue("");
      setFile(null);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setNameValue("");
          setFile(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <DialogTitle>Add in folder</DialogTitle>
        </DialogHeader>
        <p
          className="text-muted-foreground -mt-1 max-w-full truncate font-mono text-sm"
          title={folderRelativePath}
        >
          {folderRelativePath}
        </p>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "markdown" | "upload")}
          className="w-full gap-3"
        >
          <TabsList
            className="grid h-9 w-full min-w-0 grid-cols-2 p-1"
            aria-label="How to add a file"
          >
            <TabsTrigger
              value="markdown"
              className="w-full gap-1.5 px-3"
              title="Create a new Markdown file with a default template"
            >
              Markdown
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="w-full gap-1.5 px-3"
              title="Upload a file from your device"
            >
              Upload
            </TabsTrigger>
          </TabsList>
          <TabsContent value="markdown" className="mt-0 space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="v2-add-md-name">File name</Label>
              <Input
                id="v2-add-md-name"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="notes.md"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const n = ensureMdExtension(nameValue);
                    if (n) {
                      onCreateMarkdown(n);
                    }
                  }
                }}
              />
              <p className="text-muted-foreground text-xs">Adds `.md` if no extension. Starts with: &quot;# New document&quot;.</p>
            </div>
          </TabsContent>
          <TabsContent value="upload" className="mt-0 space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="v2-add-file-upload">File</Label>
              <Input
                id="v2-add-file-upload"
                type="file"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                }}
              />
              <p className="text-muted-foreground text-xs">
                Zip files are extracted automatically. Duplicate names get a (2), (3)… suffix.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          {tab === "markdown" ? (
            <Button
              type="button"
              onClick={() => {
                const n = ensureMdExtension(nameValue);
                if (n) {
                  onCreateMarkdown(n);
                }
              }}
              disabled={isSubmitting || !ensureMdExtension(nameValue)}
            >
              {isSubmitting ? "Creating…" : "Create"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                if (file) {
                  onUpload(file);
                }
              }}
              disabled={isSubmitting || !file}
            >
              {isSubmitting ? "Uploading…" : "Upload"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { cn } from "@/lib/utils";

export type CreateFolderInFolderDialogProps = {
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderRelativePath: string;
  isSubmitting: boolean;
  onConfirm: (folderName: string) => void;
};

function normalizeName(name: string): string {
  return name.replace(/[\\/]+/g, "").trim();
}

export function CreateFolderInFolderDialog(props: CreateFolderInFolderDialogProps): ReactElement {
  const { className, open, onOpenChange, folderRelativePath, isSubmitting, onConfirm } = props;
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setValue("");
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setValue("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className={cn(className)}>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground -mt-1 max-w-full truncate font-mono text-sm" title={folderRelativePath}>
          {folderRelativePath}
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="v2-new-folder-name">Folder name</Label>
          <Input
            id="v2-new-folder-name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="new-folder"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const n = normalizeName(value);
                if (n) {
                  onConfirm(n);
                }
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              const n = normalizeName(value);
              if (n) {
                onConfirm(n);
              }
            }}
            disabled={isSubmitting || !normalizeName(value)}
          >
            {isSubmitting ? "Creating…" : "Create folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

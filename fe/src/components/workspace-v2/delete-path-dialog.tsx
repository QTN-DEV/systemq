import { type ReactElement } from "react";

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
import { cn } from "@/lib/utils";

export type DeletePathDialogProps = {
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isFolder: boolean;
  onConfirm: () => void;
  isDeleting: boolean;
};

export function DeletePathDialog(props: DeletePathDialogProps): ReactElement {
  const { className, open, onOpenChange, name, isFolder, onConfirm, isDeleting } = props;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(className)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {isFolder ? "folder" : "file"}?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-mono break-all text-foreground">{name}</span>
            {" "}
            will be removed from this workspace. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

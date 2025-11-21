import { useState, useEffect, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DocumentItem } from "@/types/documents";

interface RenameFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  item: DocumentItem | null;
  isLoading: boolean;
}

export function RenameForm({
  isOpen,
  onClose,
  onSubmit,
  item,
  isLoading,
}: RenameFormProps): React.ReactElement | null {
  const [name, setName] = useState("");

  useEffect(() => {
    if (item) {
      setName(item.name);
    }
  }, [item]);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    await onSubmit(name.trim());
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Rename {item.type === "folder" ? "Folder" : "File"}
          </DialogTitle>
          <DialogDescription>
            Enter a new name for "{item.name}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { void handleSubmit(e); }}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">
                {item.type === "folder" ? "Folder" : "File"} Name
              </Label>
              <Input
                id="itemName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

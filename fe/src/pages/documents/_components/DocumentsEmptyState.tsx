import { FileText, Folder } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyStateData {
  title: string;
  description: string;
  showActions: boolean;
}

interface DocumentsEmptyStateProps {
  emptyState: EmptyStateData;
  onCreateFolder: () => void;
  onCreateFile: () => void;
}

export function DocumentsEmptyState({
  emptyState,
  onCreateFolder,
  onCreateFile,
}: DocumentsEmptyStateProps) {
  return (
    <div className="px-6 py-16 text-center bg-card border rounded-lg">
      <div className="flex flex-col items-center">
        <div
          className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4"
          aria-hidden="true"
        >
          <Folder className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{emptyState.title}</h3>
        <p className="text-muted-foreground max-w-sm">
          {emptyState.description}
        </p>
        {emptyState.showActions && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={onCreateFolder}>
              <Folder className="w-4 h-4 mr-2" />
              New Folder
            </Button>
            <Button onClick={onCreateFile}>
              <FileText className="w-4 h-4 mr-2" />
              New Document
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

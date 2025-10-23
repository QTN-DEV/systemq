import { Folder, Plus, Share2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { DocumentItem } from "@/types/documents";

import { getInitials, getRoleColor } from "../_utils";

interface DocumentsHeaderProps {
  currentFolder: DocumentItem | null | undefined;
  canEditFolder: boolean;
  isSharedView: boolean;
  onShare: () => void;
  onCreateFolder: () => void;
}

export function DocumentsHeader({
  currentFolder,
  canEditFolder,
  isSharedView,
  onShare,
  onCreateFolder,
}: DocumentsHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start sm:items-center justify-between mb-4 gap-3">
        <div className="min-w-0">
          {currentFolder ? (
            <div className="flex items-center">
              <div className="flex-shrink-0 h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4 border border-primary/20">
                <Folder className="h-8 w-8 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-semibold truncate">
                  {currentFolder.name}
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                  <span>Owned by</span>
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback
                        className={`text-white text-xs ${getRoleColor(
                          currentFolder.ownedBy?.role
                        )}`}
                      >
                        {getInitials(currentFolder.ownedBy?.name ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {currentFolder.ownedBy?.name ?? "Unknown"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold">Documents</h1>
              <p className="text-muted-foreground mt-1">
                Manage your documents, folders, and files in one centralized
                location.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {currentFolder && (
            <Button
              onClick={onShare}
              disabled={!canEditFolder}
              className="flex items-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>
          )}
          {!isSharedView && (
            <Button
              onClick={onCreateFolder}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Folder</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

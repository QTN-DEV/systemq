import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentItem } from "@/types/documents";

interface ActionDropdownProps {
  item: DocumentItem;
  canEdit: boolean;
  isOwner: boolean;
  isSystemAdmin?: boolean;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onShare: () => void;
  className?: string;
}

export function ActionDropdown({
  canEdit,
  isOwner,
  isSystemAdmin = false,
  onRename,
  onMove,
  onDelete,
  onShare,
  className,
}: ActionDropdownProps): React.ReactElement {
  // System Admins can do all actions regardless of ownership
  const canMove = isSystemAdmin || isOwner;
  const canDelete = isSystemAdmin || isOwner;
  const canShare = isSystemAdmin || canEdit;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={className}
          onClick={(e) => e.stopPropagation()}
          aria-label="Actions menu"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem
          onClick={onMove}
          disabled={!canMove}
          className={!canMove ? "text-muted-foreground" : ""}
        >
          Move to Folder
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          disabled={!canDelete}
          className={!canDelete ? "text-muted-foreground" : "text-destructive"}
        >
          Delete
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onShare}
          disabled={!canShare}
          className={!canShare ? "text-muted-foreground" : ""}
        >
          Share
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

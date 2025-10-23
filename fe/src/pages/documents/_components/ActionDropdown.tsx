import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { DocumentItem } from "@/types/documents";

interface ActionDropdownProps {
  item: DocumentItem;
  canEdit: boolean;
  isOwner: boolean;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onShare: () => void;
}

export function ActionDropdown({
  canEdit,
  isOwner,
  onRename,
  onMove,
  onDelete,
  onShare,
}: ActionDropdownProps) {
  return (
    <DropdownMenuContent
      align="end"
      className="absolute right-2 top-10 w-48 z-[100]"
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
      <DropdownMenuItem
        onClick={onMove}
        disabled={!isOwner}
        className={!isOwner ? "text-muted-foreground" : ""}
      >
        Move to Folder
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={onDelete}
        disabled={!isOwner}
        className={!isOwner ? "text-muted-foreground" : "text-destructive"}
      >
        Delete
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={onShare}
        disabled={!canEdit}
        className={!canEdit ? "text-muted-foreground" : ""}
      >
        Share
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

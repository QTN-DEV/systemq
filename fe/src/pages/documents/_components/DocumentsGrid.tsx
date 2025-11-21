import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DocumentItem } from "@/types/documents";

import { ActionDropdown } from "./ActionDropdown";
import { DocumentsFileCard } from "./DocumentsFileCard";
import { DocumentsFolderCard } from "./DocumentsFolderCard";

interface DocumentsGridProps {
  items: DocumentItem[];
  itemCounts: Record<string, number>;
  itemPermissions: Record<string, boolean>;
  contributorsMap: Record<string, string[]>;
  isSharedView: boolean;
  isOwner: (item: DocumentItem) => boolean;
  isSystemAdmin?: boolean;
  onItemClick: (item: DocumentItem) => void;
  onOpenContributors: (item: DocumentItem, contributors: string[]) => void;
  onRename: (item: DocumentItem) => void;
  onMove: (item: DocumentItem) => void;
  onDelete: (item: DocumentItem) => void;
  onShare: (item: DocumentItem) => void;
  type: "folder" | "file";
  title: string;
  showAddButton?: boolean;
  onAdd?: () => void;
  emptyMessage?: string;
}

export function DocumentsGrid({
  items,
  itemCounts,
  itemPermissions,
  contributorsMap,
  isSharedView,
  isOwner,
  isSystemAdmin = false,
  onItemClick,
  onOpenContributors,
  onRename,
  onMove,
  onDelete,
  onShare,
  type,
  title,
  showAddButton,
  onAdd,
  emptyMessage,
}: DocumentsGridProps): React.ReactElement {
  const filteredItems = items.filter((item) => item.type === type);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {showAddButton && onAdd && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="hidden sm:inline-flex"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New {type === "folder" ? "Folder" : "Document"}
          </Button>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <div className="col-span-full">
          <div className="w-full rounded-lg border border-dashed bg-muted/50 px-6 py-12 text-center">
            <p className="text-sm font-medium mb-1">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const canEdit = itemPermissions[item.id] ?? false;
            const showDots = !isSharedView || canEdit || isOwner(item);

            if (type === "folder") {
              const contributors =
                contributorsMap[item.id] ?? [
                  item.ownedBy?.name ?? "Owner",
                ];

              return (
                <DocumentsFolderCard
                  key={item.id}
                  item={item}
                  itemCount={itemCounts[item.id] ?? 0}
                  canEdit={canEdit}
                  isSharedView={isSharedView}
                  contributors={contributors}
                  onOpen={() => onItemClick(item)}
                  onOpenContributors={(e) => {
                    e.stopPropagation();
                    onOpenContributors(item, contributors);
                  }}
                >
                  {showDots && (
                    <ActionDropdown
                      item={item}
                      canEdit={canEdit}
                      isOwner={isOwner(item)}
                      isSystemAdmin={isSystemAdmin}
                      className="text-white/80 hover:bg-white/10"
                      onRename={() => onRename(item)}
                      onMove={() => onMove(item)}
                      onDelete={() => onDelete(item)}
                      onShare={() => onShare(item)}
                    />
                  )}
                </DocumentsFolderCard>
              );
            }

            return (
              <DocumentsFileCard
                key={item.id}
                item={item}
                canEdit={canEdit}
                isSharedView={isSharedView}
                onOpen={() => onItemClick(item)}
              >
                {showDots && (
                  <ActionDropdown
                    item={item}
                    canEdit={canEdit}
                    isOwner={isOwner(item)}
                    isSystemAdmin={isSystemAdmin}
                    className="absolute right-2 top-0"
                    onRename={() => onRename(item)}
                    onMove={() => onMove(item)}
                    onDelete={() => onDelete(item)}
                    onShare={() => onShare(item)}
                  />
                )}
              </DocumentsFileCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

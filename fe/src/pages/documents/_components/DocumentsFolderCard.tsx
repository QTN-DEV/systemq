import { Folder, MoreHorizontal } from "lucide-react";
import { type MouseEvent } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/types/documents";

import { colorForName, getInitials } from "../_utils";

interface DocumentsFolderCardProps {
  item: DocumentItem;
  itemCount: number;
  canEdit: boolean;
  isSharedView: boolean;
  contributors: string[];
  onOpen: () => void;
  onShowActions: (e: MouseEvent) => void;
  onOpenContributors: (e: MouseEvent) => void;
  showActionsDropdown: boolean;
  children?: React.ReactNode;
}

export function DocumentsFolderCard({
  item,
  itemCount,
  canEdit,
  isSharedView,
  contributors,
  onOpen,
  onShowActions,
  onOpenContributors,
  showActionsDropdown,
  children,
}: DocumentsFolderCardProps) {
  const maxCircles = 3;
  const visible = contributors.slice(0, maxCircles);
  const extra = Math.max(0, contributors.length - maxCircles);

  return (
    <Card
      className="group relative cursor-pointer hover:shadow-md transition-shadow py-0"
      onClick={onOpen}
    >
      <div className="relative h-28 bg-gradient-to-br from-gray-900 via-gray-800 to-slate-600 px-4 pt-3 rounded-t-xl">
        <div className="absolute left-3 top-3 h-7 w-7 rounded-full bg-white/95 flex items-center justify-center shadow">
          <Folder className="h-4 w-4 text-gray-700" />
        </div>

        {(!isSharedView || canEdit) && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onShowActions}
            className="absolute right-2 top-2 text-white/80 hover:bg-white/10"
            aria-label={`Actions for ${item.name}`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        )}

        {isSharedView && (
          <Badge
            variant={canEdit ? "default" : "secondary"}
            className={cn(
              "absolute top-2 text-[10px]",
              (!isSharedView || canEdit) ? "right-10" : "right-2"
            )}
          >
            {canEdit ? "Editor" : "Viewer"}
          </Badge>
        )}

        <div className="mt-8 text-white font-semibold leading-snug line-clamp-2 pr-4">
          {item.name}
        </div>
        <div className="mt-1 text-xs text-white/70">{itemCount} items</div>
      </div>

      <Button
        variant="ghost"
        onClick={onOpenContributors}
        className="w-full bg-background px-4 py-3 flex items-center justify-between rounded-b-xl hover:bg-accent text-left h-auto"
        aria-label={`Open contributors for ${item.name}`}
      >
        <div className="text-sm flex items-center">
          <span className="font-medium">Contributors</span>
          <span className="ml-1">:</span>
        </div>
        <div className="flex items-center space-x-2">
          {visible.map((n, idx) => (
            <Avatar
              key={`${item.id}-chip-${idx}`}
              className={cn("w-6 h-6", colorForName(n))}
              title={n}
            >
              <AvatarFallback
                className={cn("text-white text-[10px]", colorForName(n))}
              >
                {getInitials(n)}
              </AvatarFallback>
            </Avatar>
          ))}
          {extra > 0 && (
            <Badge variant="outline" className="text-[10px] h-6">
              +{extra}
            </Badge>
          )}
        </div>
      </Button>

      {showActionsDropdown && children}
    </Card>
  );
}

import { FileText } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/types/documents";

import { formatDate, getInitials, getRoleColor } from "../_utils";

interface DocumentsFileCardProps {
  item: DocumentItem;
  canEdit: boolean;
  isSharedView: boolean;
  onOpen: () => void;
  children?: React.ReactNode;
}

export function DocumentsFileCard({
  item,
  canEdit,
  isSharedView,
  onOpen,
  children,
}: DocumentsFileCardProps) {
  return (
    <Card
      className="relative cursor-pointer hover:shadow-md transition-shadow"
      onClick={onOpen}
    >
      <CardContent>
        <div className="relative">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {(!isSharedView || canEdit) && children}

          {isSharedView && (
            <Badge
              variant={canEdit ? "default" : "secondary"}
              className={cn(
                "absolute top-0 text-[10px]",
                (!isSharedView || canEdit) ? "right-10" : "right-2"
              )}
            >
              {canEdit ? "Editor" : "Viewer"}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardContent>
        <div className="text-sm font-semibold line-clamp-2 mb-1">
          {item.name}
        </div>
        <div className="text-xs text-muted-foreground mb-3">
          Last edited {formatDate(item.lastModified ?? "")}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Avatar className={cn("w-5 h-5", getRoleColor(item.ownedBy?.role))}>
              <AvatarFallback
                className={cn(
                  "text-white text-[10px]",
                  getRoleColor(item.ownedBy?.role)
                )}
              >
                {getInitials(item.ownedBy?.name ?? "")}
              </AvatarFallback>
            </Avatar>
            <span>
              Created by{" "}
              <span className="font-medium text-foreground">
                {item.ownedBy?.name ?? "Unknown"}
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

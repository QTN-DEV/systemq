import { FolderOpen } from "lucide-react";
import { type KeyboardEvent, type ReactElement } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type WorkspaceV2ListCardProps = {
  className?: string;
  name: string;
  id: string;
  onOpen: () => void;
};

function handleOpenKeyDown(e: KeyboardEvent<HTMLDivElement>, onOpen: () => void): void {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onOpen();
  }
}

export function WorkspaceV2ListCard(props: WorkspaceV2ListCardProps): ReactElement {
  const { className, name, id, onOpen } = props;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => handleOpenKeyDown(e, onOpen)}
      className={cn(
        "cursor-pointer py-5 transition-shadow hover:shadow-md focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      <CardHeader className="gap-3">
        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
          <FolderOpen className="text-muted-foreground h-5 w-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <CardTitle className="line-clamp-2 text-base leading-snug">{name}</CardTitle>
          <CardDescription className="font-mono text-[11px] break-all">{id}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

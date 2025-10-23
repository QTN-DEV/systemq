import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { colorForName, getInitials } from "../_utils";

interface ContributorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contributors: string[];
  itemName: string;
}

export function ContributorsModal({
  isOpen,
  onClose,
  contributors,
  itemName,
}: ContributorsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Contributors</DialogTitle>
          <DialogDescription>
            {contributors.length} contributor
            {contributors.length !== 1 ? "s" : ""} · {itemName}
          </DialogDescription>
        </DialogHeader>

        {contributors.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            {contributors.slice(0, 6).map((n, i) => (
              <Avatar key={`preview-${i}`} className="w-7 h-7" title={n}>
                <AvatarFallback
                  className={`text-white text-[10px] ${colorForName(n)}`}
                >
                  {getInitials(n)}
                </AvatarFallback>
              </Avatar>
            ))}
            {contributors.length > 6 && (
              <div className="px-2 h-7 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center border">
                +{contributors.length - 6}
              </div>
            )}
          </div>
        )}

        <ScrollArea className="max-h-[50vh] pr-4">
          <ul className="space-y-2">
            {contributors.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                No contributors.
              </li>
            ) : (
              contributors.map((n, i) => (
                <li key={`${n}-${i}`} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback
                      className={`text-white text-xs ${colorForName(n)}`}
                    >
                      {getInitials(n)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{n}</span>
                </li>
              ))
            )}
          </ul>
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

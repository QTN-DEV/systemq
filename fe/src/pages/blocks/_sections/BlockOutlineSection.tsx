import { Plus } from "lucide-react";
import type { ReactElement, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Block, BlockStatus } from "@/types/block-type";

import { BlockTreeNode } from "../_components/BlockTreeNode";

interface Props {
  tree: Block[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (block: Block) => void;
  onNew: () => void;
  getLevelLabel: (depth: number) => string;
  onStatusChange: (block: Block, status: BlockStatus) => Promise<void>;
  scrollHostRef?: RefObject<HTMLDivElement | null>;
}

export function BlockOutlineSection({
  tree,
  loading,
  selectedId,
  onSelect,
  onNew,
  getLevelLabel,
  onStatusChange,
  scrollHostRef,
}: Props): ReactElement {
  return (
    <div ref={scrollHostRef} className="flex flex-col h-full border-r bg-background">
      <div className="flex h-10 items-center justify-between border-b px-3">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Products
        </span>
        <Button size="icon-sm" variant="ghost" onClick={onNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div>
          {loading ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">Loading...</div>
          ) : tree.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">No blocks yet.</p>
              <Button variant="link" size="sm" className="mt-1" onClick={onNew}>
                Create your first block
              </Button>
            </div>
          ) : (
            tree.map((block) => (
              <BlockTreeNode
                key={block.id}
                block={block}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
                getLevelLabel={getLevelLabel}
                onStatusChange={onStatusChange}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

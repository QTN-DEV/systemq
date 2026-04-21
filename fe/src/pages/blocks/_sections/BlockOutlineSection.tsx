import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Block } from "@/types/block-type";

import { BlockTreeNode } from "../_components/BlockTreeNode";

interface Props {
  tree: Block[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (block: Block) => void;
  onNew: () => void;
}

export function BlockOutlineSection({ tree, loading, selectedId, onSelect, onNew }: Props) {
  return (
    <div className="flex flex-col h-full border-r bg-background">
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Blocks
        </span>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1 px-1">
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
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

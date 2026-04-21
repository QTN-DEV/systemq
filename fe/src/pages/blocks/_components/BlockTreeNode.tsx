import { ChevronDown, ChevronRight, Circle } from "lucide-react";
import { useState } from "react";

import type { Block } from "@/types/block-type";

import { BlockStatusBadge } from "./BlockStatusBadge";

interface Props {
  block: Block;
  depth: number;
  selectedId: string | null;
  onSelect: (block: Block) => void;
}

export function BlockTreeNode({ block, depth, selectedId, onSelect }: Props) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (block.children?.length ?? 0) > 0;
  const isSelected = selectedId === block.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent group transition-colors ${
          isSelected ? "bg-accent" : ""
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(block)}
      >
        {hasChildren ? (
          <button
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <Circle className="h-2 w-2 text-muted-foreground/40 flex-shrink-0 ml-0.5" />
        )}

        <span className="flex-1 text-sm truncate">{block.title}</span>
        <BlockStatusBadge status={block.status} />
      </div>

      {hasChildren && expanded && (
        <div>
          {block.children!.map((child) => (
            <BlockTreeNode
              key={child.id}
              block={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { ChevronDown, ChevronRight, Circle } from "lucide-react";
import { useState, type KeyboardEvent, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Block, BlockStatus } from "@/types/block-type";

import { shouldDisplayLevelLabel } from "../_hooks/useBlockLevelConfig";

import { BlockStatusBadge } from "./BlockStatusBadge";
import { BLOCK_ROW_HEIGHT, BLOCK_STATUS_OPTIONS } from "./blockUi";

interface Props {
  block: Block;
  depth: number;
  selectedId: string | null;
  onSelect: (block: Block) => void;
  getLevelLabel: (depth: number) => string;
  onStatusChange: (block: Block, status: BlockStatus) => Promise<void>;
}

export function BlockTreeNode({
  block,
  depth,
  selectedId,
  onSelect,
  getLevelLabel,
  onStatusChange,
}: Props): ReactElement {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (block.children?.length ?? 0) > 0;
  const isSelected = selectedId === block.id;
  const childBlocks = block.children ?? [];
  const levelLabel = getLevelLabel(depth).trim();

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(block);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 rounded-md px-2 hover:bg-accent group transition-colors ${
          isSelected ? "bg-accent" : ""
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px`, height: `${BLOCK_ROW_HEIGHT}px` }}
        onClick={() => onSelect(block)}
        onKeyDown={handleRowKeyDown}
        role="button"
        tabIndex={0}
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

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="truncate text-sm leading-5">{block.title}</span>
          {shouldDisplayLevelLabel(levelLabel) ? (
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">
              {levelLabel}
            </span>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-auto p-0 hover:bg-transparent"
              onClick={(event) => event.stopPropagation()}
            >
              <BlockStatusBadge status={block.status} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {BLOCK_STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={(event) => {
                  event.stopPropagation();
                  void onStatusChange(block, option.value);
                }}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && expanded && (
        <div>
          {childBlocks.map((child) => (
            <BlockTreeNode
              key={child.id}
              block={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              getLevelLabel={getLevelLabel}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

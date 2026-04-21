import {
  addDays,
  differenceInDays,
  eachWeekOfInterval,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import type { KeyboardEvent, ReactElement, RefObject } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { Block } from "@/types/block-type";

import { BLOCK_ROW_HEIGHT } from "../_components/blockUi";

// Flatten the tree into ordered rows preserving depth/order
function flattenTree(tree: Block[]): Block[] {
  const result: Block[] = [];
  const walk = (blocks: Block[]): void => {
    for (const b of blocks) {
      result.push(b);
      if (b.children?.length) walk(b.children);
    }
  };
  walk(tree);
  return result;
}

function computeRange(blocks: Block[]): { rangeStart: Date; rangeEnd: Date } {
  const dates: Date[] = [];
  for (const b of blocks) {
    if (b.start_date) dates.push(parseISO(b.start_date));
    if (b.deadline) dates.push(parseISO(b.deadline));
  }
  if (dates.length === 0) {
    const today = startOfDay(new Date());
    return { rangeStart: today, rangeEnd: addDays(today, 60) };
  }
  const min = dates.reduce((a, b) => (a < b ? a : b));
  const max = dates.reduce((a, b) => (a > b ? a : b));
  return { rangeStart: addDays(min, -7), rangeEnd: addDays(max, 14) };
}

const STATUS_COLORS: Record<string, string> = {
  triage: "bg-gray-300",
  backlog: "bg-slate-400",
  todo: "bg-blue-400",
  inprogress: "bg-amber-400",
  done: "bg-green-500",
};

const COL_WIDTH = 28; // px per day

interface Props {
  tree: Block[];
  selectedId: string | null;
  onSelect: (block: Block) => void;
  scrollHostRef?: RefObject<HTMLDivElement | null>;
}

export function GanttSection({
  tree,
  selectedId,
  onSelect,
  scrollHostRef,
}: Props): ReactElement {
  const flat = flattenTree(tree);

  if (flat.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground bg-muted/10">
        No blocks with dates to display. Set start/deadline on blocks to see the Gantt chart.
      </div>
    );
  }

  const { rangeStart, rangeEnd } = computeRange(flat);
  const totalDays = differenceInDays(rangeEnd, rangeStart) + 1;

  const weeks = eachWeekOfInterval({ start: rangeStart, end: rangeEnd });

  const dayToCol = (date: Date): number => differenceInDays(startOfDay(date), startOfDay(rangeStart)) + 1;

  return (
    <div ref={scrollHostRef} className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header: week labels */}
      <div
        className="flex h-10 flex-shrink-0 border-b bg-muted/30"
        style={{ paddingLeft: 0 }}
      >
        <div
          className="relative h-10 flex-shrink-0"
          style={{ width: `${totalDays * COL_WIDTH}px` }}
        >
          {weeks.map((weekStart) => {
            const col = dayToCol(weekStart);
            if (col < 1 || col > totalDays) return null;
            return (
              <div
                key={weekStart.toISOString()}
                className="absolute top-0 bottom-0 flex items-center border-l pl-2 text-xs font-medium text-muted-foreground"
                style={{ left: `${(col - 1) * COL_WIDTH}px` }}
              >
                {format(weekStart, "MMM d")}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rows */}
      <ScrollArea className="flex-1" classNameViewport="overflow-x-auto overflow-y-auto">
        <div
          className="relative"
          style={{ width: `${totalDays * COL_WIDTH}px`, minWidth: "100%" }}
        >
          {/* Grid lines */}
          {weeks.map((weekStart) => {
            const col = dayToCol(weekStart);
            if (col < 1) return null;
            return (
              <div
                key={weekStart.toISOString()}
                className="absolute top-0 bottom-0 border-l border-border/40"
                style={{ left: `${(col - 1) * COL_WIDTH}px` }}
              />
            );
          })}

          {/* Block rows */}
          {flat.map((block, i) => {
            const parsedStart = block.start_date ? parseISO(block.start_date) : null;
            const parsedEnd = block.deadline ? parseISO(block.deadline) : null;
            const startCol = parsedStart && isValid(parsedStart) ? dayToCol(parsedStart) : null;
            const endCol = parsedEnd && isValid(parsedEnd) ? dayToCol(parsedEnd) : null;
            const isSelected = selectedId === block.id;
            const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(block);
              }
            };

            return (
              <div
                key={block.id}
                className={`relative flex items-center border-b border-border/20 cursor-pointer transition-colors ${
                  isSelected ? "bg-accent/50" : i % 2 === 0 ? "bg-background" : "bg-muted/10"
                }`}
                style={{ height: `${BLOCK_ROW_HEIGHT}px` }}
                onClick={() => onSelect(block)}
                onKeyDown={handleRowKeyDown}
                role="button"
                tabIndex={0}
              >
                {startCol !== null && endCol !== null && (
                  <div
                    className={`absolute inset-y-2 rounded flex items-center px-1.5 overflow-hidden ${
                      STATUS_COLORS[block.status] ?? "bg-gray-300"
                    } ${isSelected ? "ring-2 ring-primary ring-offset-1" : "hover:opacity-90"}`}
                    style={{
                      left: `${(startCol - 1) * COL_WIDTH}px`,
                      width: `${Math.max(endCol - startCol + 1, 1) * COL_WIDTH - 2}px`,
                    }}
                  >
                    <span className="text-xs font-medium text-white truncate drop-shadow-sm">
                      {block.title}
                    </span>
                  </div>
                )}

                {/* No-date indicator */}
                {startCol === null && endCol === null && (
                  <div className="absolute left-2 text-xs text-muted-foreground/50 italic">
                    {block.title} — no dates
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

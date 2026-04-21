import type { Block } from "@/types/block-type";

const STATUS_COLORS: Record<string, string> = {
  triage: "bg-gray-300",
  backlog: "bg-slate-400",
  todo: "bg-blue-400",
  inprogress: "bg-amber-400",
  done: "bg-green-500",
};

interface Props {
  block: Block;
  startCol: number;
  endCol: number;
  row: number;
  totalCols: number;
  onClick: () => void;
  isSelected: boolean;
}

export function GanttBar({ block, startCol, endCol, row, onClick, isSelected }: Props) {
  const colorClass = STATUS_COLORS[block.status] ?? "bg-gray-300";

  return (
    <div
      className={`absolute inset-y-0.5 rounded flex items-center px-1.5 cursor-pointer transition-opacity overflow-hidden group ${colorClass} ${
        isSelected ? "ring-2 ring-offset-1 ring-primary" : "hover:opacity-90"
      }`}
      style={{
        gridColumnStart: startCol,
        gridColumnEnd: endCol + 1,
        gridRowStart: row,
        left: `calc((${startCol - 1}) * var(--col-width))`,
        width: `calc(${endCol - startCol + 1} * var(--col-width))`,
      }}
      onClick={onClick}
      title={block.title}
    >
      <span className="text-xs font-medium text-white truncate drop-shadow-sm">
        {block.title}
      </span>
    </div>
  );
}

import type { BlockStatus } from "@/types/block-type";

const STATUS_CONFIG: Record<BlockStatus, { label: string; className: string }> = {
  triage: { label: "Triage", className: "bg-gray-100 text-gray-600 border-gray-200" },
  backlog: { label: "Backlog", className: "bg-slate-100 text-slate-600 border-slate-200" },
  todo: { label: "Todo", className: "bg-blue-50 text-blue-600 border-blue-200" },
  inprogress: { label: "In Progress", className: "bg-amber-50 text-amber-700 border-amber-200" },
  done: { label: "Done", className: "bg-green-50 text-green-700 border-green-200" },
};

interface Props {
  status: BlockStatus;
  size?: "sm" | "md";
}

export function BlockStatusBadge({ status, size = "sm" }: Props) {
  const { label, className } = STATUS_CONFIG[status];
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";
  return (
    <span className={`inline-flex items-center rounded border font-medium ${sizeClass} ${className}`}>
      {label}
    </span>
  );
}

export { STATUS_CONFIG };

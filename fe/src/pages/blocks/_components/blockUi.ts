import type { BlockStatus } from "@/types/block-type";

export const BLOCK_ROW_HEIGHT = 44;

export const BLOCK_STATUS_CONFIG: Record<BlockStatus, { label: string; className: string }> = {
  triage: { label: "Triage", className: "bg-gray-100 text-gray-600 border-gray-200" },
  backlog: { label: "Backlog", className: "bg-slate-100 text-slate-600 border-slate-200" },
  todo: { label: "Todo", className: "bg-blue-50 text-blue-600 border-blue-200" },
  inprogress: { label: "In Progress", className: "bg-amber-50 text-amber-700 border-amber-200" },
  done: { label: "Done", className: "bg-green-50 text-green-700 border-green-200" },
};

export const BLOCK_STATUS_OPTIONS = Object.entries(BLOCK_STATUS_CONFIG).map(([value, config]) => ({
  value: value as BlockStatus,
  label: config.label,
}));

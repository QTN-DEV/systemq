import type { ReactElement } from "react";

import type { BlockStatus } from "@/types/block-type";

import { BLOCK_STATUS_CONFIG } from "./blockUi";

interface Props {
  status: BlockStatus;
  size?: "sm" | "md";
}

export function BlockStatusBadge({ status, size = "sm" }: Props): ReactElement {
  const { label, className } = BLOCK_STATUS_CONFIG[status];
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";
  return (
    <span className={`inline-flex items-center rounded border font-medium ${sizeClass} ${className}`}>
      {label}
    </span>
  );
}

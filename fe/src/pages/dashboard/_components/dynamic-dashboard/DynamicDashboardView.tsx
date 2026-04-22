import type React from "react";

import { useStore } from "./hooks/use-store";
import type { DynamicDashboardState } from "./types";

export type DynamicDashboardViewProps = {
  children: React.ReactNode;
  condition: (state: DynamicDashboardState) => boolean;
};

export function DynamicDashboardView(
  props: DynamicDashboardViewProps,
): React.ReactElement | null {
  const isMet = useStore(props.condition);
  return isMet ? (props.children as React.ReactElement) : null;
}

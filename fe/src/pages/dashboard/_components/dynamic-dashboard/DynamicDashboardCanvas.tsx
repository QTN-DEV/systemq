import {
  useMemo,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import React from "react"; // Required for scope if using React fragments
import { LiveError, LivePreview, LiveProvider } from "react-live";
import * as Recharts from "recharts";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartContainer,
  ChartStyle,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import { useStore } from "./hooks/use-store";

export type DynamicDashboardCanvasProps = {
  children?: ReactNode;
} & ComponentProps<"div">;

export function DynamicDashboardCanvas({
  ...props
}: DynamicDashboardCanvasProps): ReactElement {
  const content = useStore((state) => state.content);
  const isLoading = useStore((state) => state.isLoading);

  const liveCode = useMemo(() => normalizeLiveCode(content), [content]);

  /**
   * The scope object makes these components available as global variables
   * inside the LiveProvider's sandbox environment.
   */
  const scope = useMemo(
    () => ({
      React,
      Card,
      CardHeader,
      CardTitle,
      CardDescription,
      CardContent,
      CardFooter,
      CardAction,
      ChartTooltip,
      ChartTooltipContent,
      ChartLegend,
      ChartLegendContent,
      ChartContainer,
      ChartStyle,
      ...Recharts,
      cn,
    }),
    [],
  );

  if (isLoading) {
    return (
      <div {...props} className={cn("w-full h-full", props.className)}>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div {...props} className={cn("w-full h-full", props.className)}>
      <LiveProvider code={liveCode} scope={scope} noInline>
        <div className="flex h-full flex-col overflow-auto">
          <LivePreview />
          <LiveError className="border-t border-destructive/20 bg-destructive/5 px-4 py-3 font-mono text-xs text-destructive" />
        </div>
      </LiveProvider>
    </div>
  );
}

/**
 * Normalizes the source code string for react-live consumption.
 * - Strips imports (react-live uses scope instead).
 * - Converts default exports into a renderable format.
 * - Appends render() call if an App component is detected.
 */
function normalizeLiveCode(source: string): string {
  const trimmed = source.trim();

  if (!trimmed) {
    return 'render(() => <div className="p-6 text-sm text-muted-foreground">No dashboard content yet.</div>)';
  }

  let normalized = trimmed
    .replace(/^import\s+.*?;\s*/gms, "")
    .replace(
      /^export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(/m,
      "function $1(",
    )
    .replace(/^export\s+default\s+/m, "");

  // If the code defines an App component but doesn't call render, add it.
  if (
    /function\s+App\s*\(/.test(normalized) ||
    /const\s+App\s*=/.test(normalized)
  ) {
    if (!normalized.includes("render(")) {
      normalized = `${normalized}\n\nrender(<App />);`;
    }
  }

  return normalized;
}

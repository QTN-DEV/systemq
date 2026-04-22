import {
  useMemo,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { LiveError, LivePreview, LiveProvider } from "react-live";

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
      <LiveProvider code={liveCode} noInline>
        <div className="flex h-full flex-col overflow-hidden">
          <LivePreview />
          <LiveError className="border-t border-destructive/20 bg-destructive/5 px-4 py-3 font-mono text-xs text-destructive" />
        </div>
      </LiveProvider>
    </div>
  );
}

function normalizeLiveCode(source: string): string {
  const trimmed = source.trim();

  if (!trimmed) {
    return '() => <div className="p-6 text-sm text-muted-foreground">No dashboard content yet.</div>';
  }

  let normalized = trimmed
    .replace(/^import\s+.*?;\s*/gms, "")
    .replace(
      /^export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(/m,
      "function $1(",
    )
    .replace(/^export\s+default\s+/m, "");

  if (
    /function\s+App\s*\(/.test(normalized) ||
    /const\s+App\s*=/.test(normalized)
  ) {
    normalized = `${normalized}\n\nrender(<App />);`;
  }

  return normalized;
}

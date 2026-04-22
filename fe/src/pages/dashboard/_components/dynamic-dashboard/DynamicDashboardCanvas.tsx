import React, {
  useMemo,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { LiveError, LivePreview, LiveProvider } from "react-live";
import * as Recharts from "recharts";

import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
  TableFooter,
} from "@/components/ui/table";
import apiClient from "@/lib/shared/api/client";
import { cn } from "@/lib/utils";

import { useStore } from "./hooks/use-store";

const _tailwindSafelist = [
  'grid-cols-1',
  'grid-cols-2',
  'grid-cols-3',
  'grid-cols-4',
  'grid-cols-5',
  'grid-cols-6',
  'col-span-1',
  'col-span-2',
  'col-span-3'
];

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
      Table,
      TableBody,
      TableCell,
      TableHead,
      TableHeader,
      TableRow,
      TableCaption,
      TableFooter,
      Calendar,
      CalendarDayButton,
      Button,
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuLabel,
      DropdownMenuSeparator,
      DropdownMenuTrigger,
      Popover,
      PopoverContent,
      PopoverTrigger,
      Dialog,
      DialogClose,
      DialogContent,
      DialogDescription,
      DialogFooter,
      DialogHeader,
      DialogTitle,
      DialogTrigger,
      apiClient,
      Pagination,
      PaginationContent,
      PaginationEllipsis,
      PaginationItem,
      PaginationLink,
      PaginationNext,
      PaginationPrevious,
      Select,
      SelectContent,
      SelectGroup,
      SelectItem,
      SelectTrigger,
      SelectValue,
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
    .replace(/^export\s+default\s+/m, "")
    // Collapse whitespace-only gaps between JSX tags so they don't become
    // stray text nodes that break components using React.Children.only (e.g. asChild).
    .replace(/>\s+</g, "><");

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

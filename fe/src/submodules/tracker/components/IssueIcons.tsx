import { cn } from "@/lib/utils";
import { 
  Circle, 
  CircleDashed, 
  CircleDot, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  MoreHorizontal,
  Minus
} from "lucide-react";

export type IssueStatus = 
  | "backlog" 
  | "todo" 
  | "in_progress" 
  | "in_review" 
  | "done" 
  | "canceled" 
  | "triage"
  | "planned"
  | "active"
  | "halted";

export function StatusIcon({ status, className }: { status: string; className?: string }) {
  switch (status) {
    case "backlog":
      return <CircleDashed className={cn("w-4 h-4 text-muted-foreground", className)} />;
    case "todo":
    case "planned":
      return <Circle className={cn("w-4 h-4 text-muted-foreground", className)} />;
    case "in_progress":
    case "active":
      return (
        <div className={cn("relative w-4 h-4", className)}>
          <Circle className="absolute inset-0 text-yellow-500/30" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
             <Circle className="text-yellow-500 w-4 h-4" />
          </div>
        </div>
      );
    case "in_review":
      return (
        <div className={cn("relative w-4 h-4", className)}>
          <Circle className="absolute inset-0 text-blue-500/30" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
             <Circle className="text-blue-500 w-4 h-4" />
          </div>
        </div>
      );
    case "done":
      return <CheckCircle2 className={cn("w-4 h-4 text-purple-500", className)} />;
    case "canceled":
      return <XCircle className={cn("w-4 h-4 text-muted-foreground", className)} />;
    case "triage":
      return <AlertCircle className={cn("w-4 h-4 text-orange-500", className)} />;
    case "halted":
      return <CircleDot className={cn("w-4 h-4 text-red-500", className)} />;
    default:
      return <Circle className={cn("w-4 h-4 text-muted-foreground", className)} />;
  }
}

export function PriorityIcon({ priority, className }: { priority: number; className?: string }) {
  switch (priority) {
    case 0: // Urgent
      return <AlertCircle className={cn("w-4 h-4 text-red-500", className)} />;
    case 1: // High
      return (
        <div className={cn("flex flex-col gap-0.5 w-4 items-center justify-center", className)}>
          <div className="w-3 h-0.5 bg-foreground" />
          <div className="w-3 h-0.5 bg-foreground" />
          <div className="w-3 h-0.5 bg-foreground" />
        </div>
      );
    case 2: // Medium
      return (
        <div className={cn("flex flex-col gap-0.5 w-4 items-center justify-center", className)}>
          <div className="w-3 h-0.5 bg-muted-foreground/30" />
          <div className="w-3 h-0.5 bg-foreground" />
          <div className="w-3 h-0.5 bg-foreground" />
        </div>
      );
    case 3: // Low
      return (
        <div className={cn("flex flex-col gap-0.5 w-4 items-center justify-center", className)}>
          <div className="w-3 h-0.5 bg-muted-foreground/30" />
          <div className="w-3 h-0.5 bg-muted-foreground/30" />
          <div className="w-3 h-0.5 bg-foreground" />
        </div>
      );
    case 4: // None
    default:
      return <Minus className={cn("w-4 h-4 text-muted-foreground", className)} />;
  }
}

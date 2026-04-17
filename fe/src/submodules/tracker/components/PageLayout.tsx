import type { ReactNode } from "react";
import { TrackerHeader } from "./TrackerHeader";
import { cn } from "@/lib/utils";

interface BreadcrumbStep {
  label: string;
  href?: string;
}

interface PageLayoutProps {
  breadcrumbs: BreadcrumbStep[];
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageLayout({ breadcrumbs, actions, children, className }: PageLayoutProps) {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <TrackerHeader breadcrumbs={breadcrumbs} actions={actions} />
      <main className={cn("flex-1 overflow-y-auto", className)}>
        {children}
      </main>
    </div>
  );
}

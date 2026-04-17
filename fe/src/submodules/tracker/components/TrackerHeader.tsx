import type { ReactNode } from "react";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface BreadcrumbStep {
  label: string;
  href?: string;
}

interface TrackerHeaderProps {
  breadcrumbs: BreadcrumbStep[];
  actions?: ReactNode;
}

export function TrackerHeader({ breadcrumbs, actions }: TrackerHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 h-12 border-b bg-background sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((step, index) => (
              <div key={index} className="flex items-center">
                <BreadcrumbItem>
                  {step.href && index < breadcrumbs.length - 1 ? (
                    <BreadcrumbLink href={step.href} className="text-sm font-medium hover:text-foreground">
                      {step.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-sm font-medium text-foreground">
                      {step.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator className="mx-2" />}
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative group hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-9 pr-4 h-8 w-64 bg-secondary/50 border-none rounded-md text-sm focus:ring-1 focus:ring-ring transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-muted rounded border text-[10px] font-medium text-muted-foreground">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
        {actions}
      </div>
    </header>
  );
}

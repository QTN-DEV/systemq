import { ChevronRight, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DocumentBreadcrumb } from "@/types/documents";

interface DocumentsBreadcrumbProps {
  breadcrumbs: DocumentBreadcrumb[];
  onBreadcrumbClick: (breadcrumb: DocumentBreadcrumb) => void;
}

export function DocumentsBreadcrumb({
  breadcrumbs,
  onBreadcrumbClick,
}: DocumentsBreadcrumbProps): React.ReactElement | null {
  if (breadcrumbs.length <= 1) return null;

  return (
    <div className="flex items-center space-x-2 mb-6 text-sm text-muted-foreground">
      {breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <div key={breadcrumb.id} className="flex items-center space-x-2">
            {index > 0 && <ChevronRight className="w-4 h-4" />}
            {isLast ? (
              <span className="text-foreground font-semibold flex items-center space-x-1">
                {index === 0 && <Home className="w-4 h-4" />}
                <span>{breadcrumb.name}</span>
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onBreadcrumbClick(breadcrumb)}
                className="flex items-center space-x-1 h-auto p-1"
              >
                {index === 0 && <Home className="w-4 h-4" />}
                <span>{breadcrumb.name}</span>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

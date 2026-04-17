import { ChevronLeft, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface SidebarCollapsibleMenuProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: Array<{
    id: string;
    title: string;
    path: string;
  }>;
  currentPath: string;
}

export function SidebarCollapsibleMenu({
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  isOpen,
  onToggle,
  children,
  currentPath,
}: SidebarCollapsibleMenuProps): React.ReactElement {
  if (isCollapsed) {
    return (
      <Button
        asChild
        variant="ghost"
        className={cn(
          "w-full justify-center px-2",
          isActive && "bg-primary/10 text-primary hover:bg-primary/15"
        )}
      >
        <Link to={children[0]?.path || "#"} title={label}>
          <Icon
            className={cn(
              "w-5 h-5",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        </Link>
      </Button>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start",
            isActive && "bg-primary/10 text-primary hover:bg-primary/15"
          )}
        >
          <Icon
            className={cn(
              "w-5 h-5 mr-3",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
          <span className="truncate flex-1 text-left">{label}</span>
          <ChevronLeft
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen ? "-rotate-90" : "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-9 mt-1 space-y-1">
        {children.map((child) => {
          const isChildActive = currentPath === child.path || currentPath.startsWith(`${child.path}/`);
          return (
            <Button
              key={child.id}
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start h-8 px-2 text-xs",
                isChildActive && "text-primary bg-primary/10"
              )}
            >
              <Link to={child.path}>{child.title}</Link>
            </Button>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

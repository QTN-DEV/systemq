import { type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarMenuItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
}

export function SidebarMenuItem({
  to,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
}: SidebarMenuItemProps) {
  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "w-full justify-start",
        isActive && "bg-primary/10 text-primary hover:bg-primary/15",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Link to={to} title={isCollapsed ? label : undefined}>
        <Icon
          className={cn(
            "w-5 h-5",
            !isCollapsed && "mr-3",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </Link>
    </Button>
  );
}

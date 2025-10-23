import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import logo from "../../../assets/logo.png";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function SidebarHeader({
  isCollapsed,
  onToggleCollapse,
}: SidebarHeaderProps) {
  return (
    <div className="p-4 border-b flex items-center justify-between">
      {!isCollapsed && (
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Internal Ops" className="w-6 h-6 invert" />
          <span className="text-lg font-semibold">Internal Ops</span>
        </div>
      )}
      {isCollapsed && (
        <img
          src={logo}
          alt="Internal Ops"
          className="w-6 h-6 mx-auto invert"
        />
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleCollapse}
        className="shrink-0"
      >
        <ChevronLeft
          className={cn(
            "w-4 h-4 transition-transform",
            isCollapsed && "rotate-180"
          )}
        />
      </Button>
    </div>
  );
}

import { LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarFooterProps {
  isCollapsed: boolean;
  onLogout: () => void;
}

export function SidebarFooter({ isCollapsed, onLogout }: SidebarFooterProps) {
  return (
    <div className="p-2 border-t space-y-1">
      <Button
        asChild
        variant="ghost"
        className={cn("w-full", isCollapsed ? "justify-center px-2" : "justify-start")}
      >
        <Link to="/change-password" title={isCollapsed ? "Change Password" : undefined}>
          <Settings className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span>Change Password</span>}
        </Link>
      </Button>
      <Button
        variant="ghost"
        onClick={onLogout}
        className={cn("w-full", isCollapsed ? "justify-center px-2" : "justify-start")}
        title={isCollapsed ? "Sign out" : undefined}
      >
        <LogOut className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
        {!isCollapsed && <span>Sign out</span>}
      </Button>
    </div>
  );
}

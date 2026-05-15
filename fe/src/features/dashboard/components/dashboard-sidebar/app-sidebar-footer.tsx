import type { ReactElement } from "react";
import { LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";

import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AppSidebarFooterProps {
  onLogout: () => void;
}

export function AppSidebarFooter({
  onLogout,
}: AppSidebarFooterProps): ReactElement {
  return (
    <SidebarFooter className="border-t">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Change Password">
            <Link to="/change-password">
              <Settings />
              <span>Change Password</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Sign out" onClick={onLogout}>
            <LogOut />
            <span>Sign out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

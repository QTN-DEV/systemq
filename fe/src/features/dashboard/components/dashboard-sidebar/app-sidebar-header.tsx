import type { ReactElement } from "react";

import logo from "@/assets/logo.png";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";


export function AppSidebarHeader(): ReactElement {
  return (
    <SidebarHeader className="border-b">
      <SidebarMenu>
        <SidebarMenuItem className="flex items-center gap-1">
          <SidebarMenuButton size="lg" className="flex-1" asChild>
            <a href="/dashboard">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary">
                <img
                  src={logo}
                  alt="Internal Ops"
                  className="size-4 invert"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Internal Ops</span>
              </div>
            </a>
          </SidebarMenuButton>
          <SidebarTrigger className="shrink-0" />
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}

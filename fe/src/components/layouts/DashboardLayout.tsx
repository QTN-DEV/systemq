import { type ReactElement, type ReactNode } from "react";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardLayout({ children }: DashboardLayoutProps): ReactElement {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="overflow-auto">{children}</SidebarInset>
    </SidebarProvider>
  );
}

export default DashboardLayout;

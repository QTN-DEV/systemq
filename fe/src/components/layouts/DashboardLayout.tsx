import { type ReactElement, type ReactNode } from "react";

import Sidebar from "@/components/Sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardLayout({ children }: DashboardLayoutProps): ReactElement {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <ScrollArea className="flex-1">
        <main className="min-h-full">{children}</main>
      </ScrollArea>
    </div>
  );
}

export default DashboardLayout;

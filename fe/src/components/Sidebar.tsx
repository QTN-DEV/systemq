import { type ReactElement } from "react";

import { cn } from "@/lib/utils";

import {
  SidebarHeader,
  SidebarUser,
  SidebarMenu,
  SidebarFooter,
} from "./sidebar/_components";
import { useSidebar } from "./sidebar/_hooks/useSidebar";
import { useSidebarActions } from "./sidebar/_hooks/useSidebarActions";
import { useSidebarMenu } from "./sidebar/_hooks/useSidebarMenu";
import { useSidebarUser } from "./sidebar/_hooks/useSidebarUser";

function Sidebar(): ReactElement {
  // Hooks - Business Logic
  const { isCollapsed, docsOpen, toggleCollapse, toggleDocsOpen } =
    useSidebar();
  const { displayName, userTitle, initials, avatarUrl } = useSidebarUser();
  const { currentRole } = useSidebarMenu();
  const { handleLogout } = useSidebarActions();

  // View
  return (
    <div
      className={cn(
        "bg-background border-r flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarHeader
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      <SidebarUser
        isCollapsed={isCollapsed}
        displayName={displayName}
        userTitle={userTitle}
        initials={initials}
        avatarUrl={avatarUrl}
        roleColor={currentRole.color}
      />

      <SidebarMenu
        isCollapsed={isCollapsed}
        docsOpen={docsOpen}
        onToggleDocsOpen={toggleDocsOpen}
      />

      <SidebarFooter isCollapsed={isCollapsed} onLogout={handleLogout} />
    </div>
  );
}

export default Sidebar;

import {
  Activity,
  type LucideIcon,
  FileText,
  LayoutDashboard,
  Building2,
  Network,
  Users,
  Folder,
  Kanban,
  Settings2,
  CircleHelp,
  Inbox,
  CheckSquare,
  MessageSquare,
  FolderOpen,
} from "lucide-react";
import { useLocation } from "react-router-dom";

import { ScrollArea } from "@/components/ui/scroll-area";

import { useSidebarMenu } from "../_hooks/useSidebarMenu";

import { SidebarCollapsibleMenu } from "./SidebarCollapsibleMenu";
import { SidebarDocsMenu } from "./SidebarDocsMenu";
import { SidebarMenuItem } from "./SidebarMenuItem";

// Icon mapping
const iconMap = {
  Activity,
  FileText,
  LayoutDashboard,
  Building2,
  Network,
  Users,
  Folder,
  Kanban,
  Settings2,
  Inbox,
  CheckSquare,
  MessageSquare,
  FolderOpen,
};

interface SidebarMenuProps {
  isCollapsed: boolean;
  openMenus: Record<string, boolean>;
  onToggleMenu: (id: string) => void;
}

export function SidebarMenu({
  isCollapsed,
  openMenus,
  onToggleMenu,
}: SidebarMenuProps): React.ReactElement {
  const { filteredMenuItems, isPathActive, isDocsPathActive, isSharedDocsActive, isSystemAdmin } =
    useSidebarMenu();
  const location = useLocation();

  return (
    <ScrollArea className="flex-1 px-2 py-4">
      <nav className="space-y-1">
        {filteredMenuItems.map((item) => {
          const Icon: LucideIcon =
            iconMap[item.icon as keyof typeof iconMap] ?? CircleHelp;
          const isActive = item.path ? isPathActive(item.path) : false;

          // Documents dropdown
          if (item.id === "documents") {
            const docsActive = isDocsPathActive();
            const isShared = isSharedDocsActive();

            return (
              <SidebarDocsMenu
                key={item.id}
                icon={Icon}
                label={item.title}
                isActive={docsActive}
                isCollapsed={isCollapsed}
                isOpen={!!openMenus["documents"]}
                onToggle={() => onToggleMenu("documents")}
                isSharedActive={isShared}
                isSystemAdmin={isSystemAdmin}
              />
            );
          }

          // Generic collapsible menu
          if (item.type === "collapsible" && item.children) {
            const isAnyChildActive = item.children.some(child =>
              location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)
            );

            return (
              <SidebarCollapsibleMenu
                key={item.id}
                icon={Icon}
                label={item.title}
                isActive={isAnyChildActive}
                isCollapsed={isCollapsed}
                isOpen={!!openMenus[item.id]}
                onToggle={() => onToggleMenu(item.id)}
                children={item.children}
                currentPath={location.pathname}
              />
            );
          }

          if (!item.path) return null;

          return (
            <SidebarMenuItem
              key={item.id}
              to={item.path}
              icon={Icon}
              label={item.title}
              isActive={isActive}
              isCollapsed={isCollapsed}
            />
          );
        })}
      </nav>
    </ScrollArea>
  );
}

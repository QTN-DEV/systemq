import {
  FileText,
  LayoutDashboard,
  Building2,
  Users,
  Folder,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";

import { useSidebarMenu } from "../_hooks/useSidebarMenu";

import { SidebarDocsMenu } from "./SidebarDocsMenu";
import { SidebarMenuItem } from "./SidebarMenuItem";

// Icon mapping
const iconMap = {
  FileText,
  LayoutDashboard,
  Building2,
  Users,
  Folder,
};

interface SidebarMenuProps {
  isCollapsed: boolean;
  docsOpen: boolean;
  onToggleDocsOpen: () => void;
}

export function SidebarMenu({
  isCollapsed,
  docsOpen,
  onToggleDocsOpen,
}: SidebarMenuProps): React.ReactElement {
  const { filteredMenuItems, isPathActive, isDocsPathActive, isSharedDocsActive, isSystemAdmin } =
    useSidebarMenu();

  return (
    <ScrollArea className="flex-1 px-2 py-4">
      <nav className="space-y-1">
        {filteredMenuItems.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const isActive = isPathActive(item.path);

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
                isOpen={docsOpen}
                onToggle={onToggleDocsOpen}
                isSharedActive={isShared}
                isSystemAdmin={isSystemAdmin}
              />
            );
          }

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

import { useMemo, type ReactElement } from "react";

import { Sidebar, SidebarRail } from "@/components/ui/sidebar";
import menuConfig from "@/config/menuConfig.json";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useMe } from "@/features/auth/hooks/use-me";

import { AppSidebarFooter } from "./app-sidebar-footer";
import { AppSidebarHeader } from "./app-sidebar-header";
import { AppSidebarNav, type AppSidebarMenuItem } from "./app-sidebar-nav";
import { AppSidebarUser } from "./app-sidebar-user";

export function DashboardSidebar(): ReactElement {
  const {
    displayName,
    userTitle,
    initials,
    avatarUrl,
    roleColor,
    role,
    title,
  } = useMe();
  const { logout } = useLogout();

  const filteredMenuItems = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filterItems = (items: any[]): AppSidebarMenuItem[] => {
      return items
        .filter((item) => {
          if (item.roles && !item.roles.includes(role)) {
            return false;
          }

          if (
            (item.id === "workload-tracking" ||
              item.id === "workload-project-mapping" ||
              item.id === "workload-report") &&
            import.meta.env.VITE_APP_ENV !== "production"
          ) {
            return false;
          }

          return true;
        })
        .map((item) => {
          if (item.children) {
            return {
              ...item,
              children: filterItems(item.children),
            };
          }
          return item;
        })
        .filter((item) => !item.children || item.children.length > 0);
    };

    return filterItems(menuConfig.menuItems);
  }, [role]);

  const isSystemAdmin = useMemo(
    () => ["System Administrator"].includes(title),
    [title],
  );

  return (
    <Sidebar
      collapsible="icon"
      className="[&_[data-slot=sidebar-inner]]:bg-background [&_[data-sidebar=sidebar]]:bg-background"
    >
      <AppSidebarHeader />
      <AppSidebarUser
        displayName={displayName}
        userTitle={userTitle}
        initials={initials}
        avatarUrl={avatarUrl}
        roleColor={roleColor}
      />
      <AppSidebarNav
        items={filteredMenuItems}
        isSystemAdmin={isSystemAdmin}
      />
      <AppSidebarFooter onLogout={logout} />
      <SidebarRail />
    </Sidebar>
  );
}

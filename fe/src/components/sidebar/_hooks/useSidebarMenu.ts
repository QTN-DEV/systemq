import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import menuConfig from "@/config/menuConfig.json";
import { useAuthStore } from "@/stores/authStore";

import { useSidebarUser } from "./useSidebarUser";

export function useSidebarMenu(): {
  filteredMenuItems: Array<{ id: string; title: string; path: string; icon: string; roles?: string[] }>
  currentRole: { name: string; color: string }
  isPathActive: (path: string) => boolean
  isDocsPathActive: () => boolean
  isSharedDocsActive: () => boolean
  isSystemAdmin: boolean
} {
  const { userRole } = useSidebarUser();
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.user);

  const filteredMenuItems = useMemo(() => {
    return menuConfig.menuItems.filter(
      (item) => !item.roles || item.roles.includes(userRole)
    );
  }, [userRole]);

  const currentRole = useMemo(() => {
    const roles = menuConfig.roles as Record<string, { name: string; color: string; permissions: string[] }> | undefined
    return roles?.[userRole] ?? {
      name: "Employee",
      color: "blue",
    };
  }, [userRole]);

  // Check if user is System Administrator
  const isSystemAdmin = useMemo(() => {
    return Boolean(
      currentUser &&
      (currentUser.position === "Admin" ||
        currentUser.role === "admin" ||
        (typeof currentUser.level === "string" &&
          ["admin", "administrator", "superadmin", "principal"].includes(
            currentUser.level.toLowerCase()
          )))
    );
  }, [currentUser]);

  const isPathActive = (path: string): boolean => {
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const isDocsPathActive = (): boolean => {
    return (
      location.pathname === "/documents" ||
      location.pathname.startsWith("/documents/")
    );
  };

  const isSharedDocsActive = (): boolean => {
    return (
      location.pathname.startsWith("/documents/shared") ||
      (location.pathname.startsWith("/documents/file/") &&
        new URLSearchParams(location.search).get("view") === "shared")
    );
  };

  return {
    filteredMenuItems,
    currentRole,
    isPathActive,
    isDocsPathActive,
    isSharedDocsActive,
    isSystemAdmin,
  };
}

import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import menuConfig from "@/config/menuConfig.json";

import { useSidebarUser } from "./useSidebarUser";

export function useSidebarMenu(): {
  filteredMenuItems: Array<{ id: string; title: string; path: string; icon: string; roles?: string[] }>
  currentRole: { name: string; color: string }
  isPathActive: (path: string) => boolean
  isDocsPathActive: () => boolean
  isSharedDocsActive: () => boolean
} {
  const { userRole } = useSidebarUser();
  const location = useLocation();

  const filteredMenuItems = useMemo(() => {
    return menuConfig.menuItems.filter(
      (item) => !item.roles || item.roles.includes(userRole)
    );
  }, [userRole]);

  const currentRole = useMemo(() => {
    return menuConfig.roles?.[userRole] ?? {
      name: "Employee",
      color: "blue",
    };
  }, [userRole]);

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
  };
}

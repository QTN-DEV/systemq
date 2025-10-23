import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import menuConfig from "@/config/menuConfig.json";

import { useSidebarUser } from "./useSidebarUser";

export function useSidebarMenu() {
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

  const isPathActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const isDocsPathActive = () => {
    return (
      location.pathname === "/documents" ||
      location.pathname.startsWith("/documents/")
    );
  };

  const isSharedDocsActive = () => {
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

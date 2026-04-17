import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import menuConfig from "@/config/menuConfig.json";
import { useAuthStore } from "@/stores/authStore";

import { useSidebarUser } from "./useSidebarUser";

interface MenuItem {
  id: string;
  title: string;
  path?: string;
  icon: string;
  type?: string;
  roles?: string[];
  children?: Array<{
    id: string;
    title: string;
    path: string;
    roles?: string[];
  }>;
}

export function useSidebarMenu(): {
  filteredMenuItems: MenuItem[]
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
    const filterItems = (items: any[]): MenuItem[] => {
      return items.filter((item) => {
        // Role check
        if (item.roles && !item.roles.includes(userRole)) {
          return false;
        }

        // Feature toggle check: Only enable workloads features in production
        if (
          (item.id === "workload-tracking" || item.id === "workload-project-mapping" || item.id === "workload-report") &&
          import.meta.env.VITE_APP_ENV !== "production"
        ) {
          return false;
        }

        return true;
      }).map((item) => {
        if (item.children) {
          return {
            ...item,
            children: filterItems(item.children)
          };
        }
        return item;
      }).filter(item => !item.children || item.children.length > 0);
    };

    return filterItems(menuConfig.menuItems);
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
    if (!currentUser) return false;
    return ["System Administrator"].includes(currentUser.title ?? "");
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

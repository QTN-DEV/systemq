import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useSidebar(): {
  isCollapsed: boolean
  openMenus: Record<string, boolean>
  location: ReturnType<typeof useLocation>
  toggleCollapse: () => void
  toggleMenu: (id: string) => void
} {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const location = useLocation();

  // Auto-open dropdowns when current path matches
  useEffect(() => {
    const newOpenMenus = { ...openMenus };
    let changed = false;

    if (location.pathname === "/documents" || location.pathname.startsWith("/documents/")) {
      if (!newOpenMenus["documents"]) {
        newOpenMenus["documents"] = true;
        changed = true;
      }
    }

    if (location.pathname === "/workload-tracking" || location.pathname === "/project-mapping") {
      if (!newOpenMenus["workload-report"]) {
        newOpenMenus["workload-report"] = true;
        changed = true;
      }
    }

    if (changed) {
      setOpenMenus(newOpenMenus);
    }
  }, [location.pathname]);

  const toggleCollapse = (): void => {
    setIsCollapsed((prev) => !prev);
  };

  const toggleMenu = (id: string): void => {
    setOpenMenus((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return {
    isCollapsed,
    openMenus,
    location,
    toggleCollapse,
    toggleMenu,
  };
}

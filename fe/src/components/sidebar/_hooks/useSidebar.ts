import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useSidebar(): {
  isCollapsed: boolean
  docsOpen: boolean
  location: ReturnType<typeof useLocation>
  toggleCollapse: () => void
  toggleDocsOpen: () => void
} {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const location = useLocation();

  // Auto-open Documents dropdown when current path is under /documents
  useEffect(() => {
    const underDocs =
      location.pathname === "/documents" ||
      location.pathname.startsWith("/documents/");
    setDocsOpen(underDocs);
  }, [location.pathname]);

  const toggleCollapse = (): void => {
    setIsCollapsed((prev) => !prev);
  };

  const toggleDocsOpen = (): void => {
    setDocsOpen((prev) => !prev);
  };

  return {
    isCollapsed,
    docsOpen,
    location,
    toggleCollapse,
    toggleDocsOpen,
  };
}

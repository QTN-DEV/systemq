import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useSidebar() {
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

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const toggleDocsOpen = () => {
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

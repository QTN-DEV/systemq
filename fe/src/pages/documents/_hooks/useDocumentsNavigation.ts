import { useNavigate } from "react-router-dom";

import { getFolderPathIds } from "@/lib/shared/services/DocumentService";
import type { DocumentItem, DocumentBreadcrumb } from "@/types/documents";

export function useDocumentsNavigation(
  isSharedView: boolean,
  effectiveSegments: string[]
) {
  const navigate = useNavigate();

  const handleItemClick = (item: DocumentItem): void => {
    if (item.type === "folder") {
      const newSegments = [...effectiveSegments, item.id];
      const prefix = isSharedView ? "shared/" : "";
      navigate(`/documents/${prefix}${newSegments.join("/")}`);
    } else {
      const viewParam = isSharedView ? "?view=shared" : "";
      navigate(`/documents/file/${item.id}${viewParam}`);
    }
  };

  const handleOpenSearchItem = async (item: DocumentItem): Promise<void> => {
    if (item.type === "folder") {
      try {
        const ids = await getFolderPathIds(item.id);
        navigate(`/documents/${ids.join("/")}`);
      } catch {
        navigate(`/documents/${item.id}`);
      }
    } else {
      navigate(`/documents/file/${item.id}`);
    }
  };

  const handleBreadcrumbClick = (breadcrumb: DocumentBreadcrumb): void => {
    if (breadcrumb.id === "root") {
      navigate(isSharedView ? "/documents/shared" : "/documents");
    } else {
      const newPath = [...breadcrumb.path, breadcrumb.id].join("/");
      const prefix = isSharedView ? "shared/" : "";
      navigate(`/documents/${prefix}${newPath}`);
    }
  };

  return {
    handleItemClick,
    handleOpenSearchItem,
    handleBreadcrumbClick,
  };
}

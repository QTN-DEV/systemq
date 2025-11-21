import { useState, useMemo } from "react";

import type { DocumentItem } from "@/types/documents";

export function useDocumentsFilter(displayItems: DocumentItem[]): {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  categories: string[];
  filteredItems: DocumentItem[];
} {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchTerm] = useState("");

  // Get categories
  const categories = useMemo((): string[] => {
    const uniqueCategories = [
      ...new Set(
        displayItems.map((item) => item.category).filter(Boolean)
      ),
    ] as string[];
    return ["All", ...uniqueCategories];
  }, [displayItems]);

  // Filter items
  const filteredItems = useMemo((): DocumentItem[] => {
    let filtered = displayItems;

    if (activeFilter !== "All") {
      filtered = filtered.filter((item) => item.category === activeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.ownedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [displayItems, activeFilter, searchTerm]);

  return {
    activeFilter,
    setActiveFilter,
    categories,
    filteredItems,
  };
}

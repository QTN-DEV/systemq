import { useState, useMemo, useRef, type MutableRefObject } from "react";

import type { DocumentItem } from "@/types/documents";

export function useDocumentsContributors(): {
  contributorsMap: Record<string, string[]>;
  prefetchContributors: (items: DocumentItem[]) => Promise<void>;
  fetchedContribIdsRef: MutableRefObject<Set<string>>;
} {
  const [contributorsMap, setContributorsMap] = useState<
    Record<string, string[]>
  >({});
  const fetchedContribIdsRef = useRef<Set<string>>(new Set());

  const prefetchContributors = useMemo(() => {
    return async (items: DocumentItem[]): Promise<void> => {
      const folders = items.filter((i) => i.type === "folder");
      if (folders.length === 0) return;

      const { getDocumentPermissions } = await import(
        "@/lib/shared/services/DocumentService"
      );
      const entries: Array<[string, string[]]> = [];

      for (const f of folders) {
        try {
          const perms = await getDocumentPermissions(f.id);
          const names: string[] = [];

          const ownerName = f.ownedBy?.name ?? "Owner";
          names.push(ownerName);

          if (perms) {
            perms.user_permissions
              ?.filter((u: { permission?: string; user_name?: string }) => u?.permission === "editor" && u?.user_name)
              ?.forEach((u: { user_name: string }) => names.push(String(u.user_name)));

            perms.division_permissions
              ?.filter((d: { permission?: string; division?: string }) => d?.permission === "editor" && d?.division)
              ?.forEach((d: { division: string }) => names.push(String(d.division)));
          }

          const cleaned = Array.from(new Set(names.filter(Boolean)));
          entries.push([f.id, cleaned]);
        } catch {
          entries.push([f.id, [f.ownedBy?.name ?? "Owner"]]);
        }
      }

      setContributorsMap((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    };
  }, []);

  return {
    contributorsMap,
    prefetchContributors,
    fetchedContribIdsRef,
  };
}

// Modal state hook
export function useContributorsModal(): {
  showContributors: boolean;
  contributorsList: string[];
  contributorsForName: string;
  openContributors: (item: DocumentItem, contributors: string[]) => void;
  closeContributors: () => void;
} {
  const [showContributors, setShowContributors] = useState(false);
  const [contributorsList, setContributorsList] = useState<string[]>([]);
  const [contributorsForName, setContributorsForName] = useState<string>("");

  const openContributors = (item: DocumentItem, contributors: string[]) => {
    setContributorsForName(item.name);
    setContributorsList(contributors);
    setShowContributors(true);
  };

  const closeContributors = () => {
    setShowContributors(false);
  };

  return {
    showContributors,
    contributorsList,
    contributorsForName,
    openContributors,
    closeContributors,
  };
}

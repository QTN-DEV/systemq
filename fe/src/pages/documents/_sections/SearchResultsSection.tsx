import type { ReactElement } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DocumentItem } from "@/types/documents";

interface SearchResultsSectionProps {
  globalQuery: string;
  globalResults: DocumentItem[];
  globalLoading: boolean;
  globalError: string | null;
  onOpenSearchItem: (item: DocumentItem) => Promise<void>;
}

export function SearchResultsSection({
  globalQuery,
  globalResults,
  globalLoading,
  globalError,
  onOpenSearchItem,
}: SearchResultsSectionProps): ReactElement {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">
          Search Results{" "}
          {globalLoading ? "(loading...)" : `(${globalResults.length})`}
        </h2>
      </div>

      {globalError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      {!globalLoading && globalResults.length === 0 && !globalError && (
        <div className="px-6 py-12 text-center bg-card border rounded">
          <p className="text-muted-foreground">
            No results for &quot;{globalQuery}&quot;.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {globalResults.map((item) => (
          <div
            key={item.id}
            onClick={() => void onOpenSearchItem(item)}
            className="cursor-pointer"
          >
            {/* Search results cards - simplified for now */}
            <div className="p-4 border rounded hover:shadow">
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.type === "folder" ? "Folder" : "File"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

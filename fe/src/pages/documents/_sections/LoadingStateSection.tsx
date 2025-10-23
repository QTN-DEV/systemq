import type { ReactElement } from "react";

export function LoadingStateSection(): ReactElement {
  return (
    <div className="px-6 py-16 text-center bg-card border">
      <div className="flex flex-col items-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground">Loading documents...</p>
      </div>
    </div>
  );
}

import type { ReactElement } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorStateSectionProps {
  error: string;
}

export function ErrorStateSection({ error }: ErrorStateSectionProps): ReactElement {
  return (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

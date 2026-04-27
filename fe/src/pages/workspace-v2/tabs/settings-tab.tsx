import { type ReactElement } from "react";

import { cn } from "@/lib/utils";

export type WorkspaceV2SettingsTabProps = {
  className?: string;
};

export function WorkspaceV2SettingsTab(props: WorkspaceV2SettingsTabProps): ReactElement {
  const { className } = props;
  return (
    <div className={cn("p-4 md:p-6", className)}>
      <p className="text-muted-foreground text-sm">Settings</p>
    </div>
  );
}

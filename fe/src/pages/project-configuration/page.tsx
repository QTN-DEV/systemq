import type { ReactElement } from "react";

import { useBlockLevelConfig } from "@/pages/blocks/_hooks/useBlockLevelConfig";
import { BlockConfigurationForm } from "@/pages/blocks/_components/BlockConfigurationForm";

export default function ProjectConfigurationPage(): ReactElement {
  const { levelNames, replaceLevelNames, resetLevelNames } = useBlockLevelConfig();

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Project Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Project Configuration</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Define how each depth in the project tree should be named. These labels are reflected in
          the management view when users create, inspect, and nest blocks.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <BlockConfigurationForm
          levelNames={levelNames}
          onSave={replaceLevelNames}
          onReset={resetLevelNames}
        />
      </div>
    </div>
  );
}

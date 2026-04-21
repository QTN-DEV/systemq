import type { ReactElement } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { BlockConfigurationForm } from "../_components/BlockConfigurationForm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levelNames: string[];
  onSave: (nextLevelNames: string[]) => void;
  onReset: () => void;
}

export function BlockConfigurationSheet({
  open,
  onOpenChange,
  levelNames,
  onSave,
  onReset,
}: Props): ReactElement {
  const handleSave = (nextLevelNames: string[]): void => {
    onSave(nextLevelNames);
    onOpenChange(false);
  };

  const handleReset = (): void => {
    onReset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg gap-0 p-0">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>Block Configuration</SheetTitle>
          <SheetDescription>
            Name each hierarchy level so the tree can read as initiative, milestone, task, or any
            structure you want.
          </SheetDescription>
        </SheetHeader>

        <BlockConfigurationForm
          levelNames={levelNames}
          onSave={handleSave}
          onReset={handleReset}
        />
      </SheetContent>
    </Sheet>
  );
}

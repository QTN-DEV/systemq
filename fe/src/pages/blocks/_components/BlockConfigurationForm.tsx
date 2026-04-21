import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  levelNames: string[];
  onSave: (nextLevelNames: string[]) => void;
  onReset: () => void;
}

export function BlockConfigurationForm({
  levelNames,
  onSave,
  onReset,
}: Props): ReactElement {
  const [draftLevelNames, setDraftLevelNames] = useState<string[]>(levelNames);

  useEffect(() => {
    setDraftLevelNames(levelNames);
  }, [levelNames]);

  const handleChange = (index: number, value: string): void => {
    setDraftLevelNames((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  };

  const handleSave = (): void => {
    onSave(draftLevelNames);
  };

  const handleReset = (): void => {
    onReset();
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Preview
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {draftLevelNames.map((levelName, index) => (
            <div
              key={`preview-${index + 1}`}
              className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium"
            >
              {`L${index + 1} · ${levelName.trim() || `Level ${index + 1}`}`}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {draftLevelNames.map((levelName, index) => {
          const inputId = `block-level-name-${index + 1}`;

          return (
            <div key={inputId} className="space-y-2">
              <Label htmlFor={inputId}>{`Level ${index + 1}`}</Label>
              <Input
                id={inputId}
                value={levelName}
                onChange={(event) => handleChange(index, event.target.value)}
                placeholder={`Name for level ${index + 1}`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex gap-2">
        <Button type="button" className="flex-1" onClick={handleSave}>
          Save Configuration
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}

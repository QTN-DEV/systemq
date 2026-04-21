import { useEffect, useState } from "react";

const STORAGE_KEY = "block-level-config-v1";

export const DEFAULT_BLOCK_LEVEL_NAMES = Array.from(
  { length: 6 },
  (_, index) => `Level ${index + 1}`
);

export function shouldDisplayLevelLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  const normalized = label.trim();
  if (!normalized) return false;
  return !/^level\s+\d+$/i.test(normalized);
}

function normalizeLevelNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return DEFAULT_BLOCK_LEVEL_NAMES;
  }

  return DEFAULT_BLOCK_LEVEL_NAMES.map((_, index) => {
    const candidate = value[index];
    return typeof candidate === "string" ? candidate.trim() : "";
  });
}

function readStoredLevelNames(): string[] {
  if (typeof window === "undefined") {
    return DEFAULT_BLOCK_LEVEL_NAMES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeLevelNames(JSON.parse(raw)) : DEFAULT_BLOCK_LEVEL_NAMES;
  } catch {
    return DEFAULT_BLOCK_LEVEL_NAMES;
  }
}

export function useBlockLevelConfig(): {
  levelNames: string[];
  updateLevelName: (depth: number, value: string) => void;
  replaceLevelNames: (next: string[]) => void;
  resetLevelNames: () => void;
  getLevelLabel: (depth: number) => string;
} {
  const [levelNames, setLevelNames] = useState<string[]>(readStoredLevelNames);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(levelNames));
  }, [levelNames]);

  const updateLevelName = (depth: number, value: string): void => {
    setLevelNames((current) =>
      current.map((name, index) => (index === depth ? value.trim() : name))
    );
  };

  const replaceLevelNames = (next: string[]): void => {
    setLevelNames(normalizeLevelNames(next));
  };

  const resetLevelNames = (): void => {
    setLevelNames(DEFAULT_BLOCK_LEVEL_NAMES);
  };

  const getLevelLabel = (depth: number): string => levelNames[depth] ?? "";

  return {
    levelNames,
    updateLevelName,
    replaceLevelNames,
    resetLevelNames,
    getLevelLabel,
  };
}

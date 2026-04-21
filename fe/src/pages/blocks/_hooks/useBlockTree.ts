import { useCallback, useEffect, useState } from "react";

import {
  createBlock,
  deleteBlock,
  getBlockTree,
  updateBlock,
} from "@/lib/shared/services/BlockService";
import type { Block, BlockCreatePayload, BlockUpdatePayload } from "@/types/block-type";

export function useBlockTree(): {
  tree: Block[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (payload: BlockCreatePayload) => Promise<Block>;
  update: (id: string, payload: BlockUpdatePayload) => Promise<Block>;
  remove: (id: string) => Promise<void>;
} {
  const [tree, setTree] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBlockTree();
      setTree(data);
    } catch {
      setError("Failed to load blocks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (payload: BlockCreatePayload): Promise<Block> => {
      const block = await createBlock(payload);
      await load();
      return block;
    },
    [load]
  );

  const update = useCallback(
    async (id: string, payload: BlockUpdatePayload): Promise<Block> => {
      const block = await updateBlock(id, payload);
      await load();
      return block;
    },
    [load]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await deleteBlock(id);
      await load();
    },
    [load]
  );

  return { tree, loading, error, reload: load, create, update, remove };
}

export function flattenTree(tree: Block[]): Block[] {
  const result: Block[] = [];
  const walk = (blocks: Block[], depth: number): void => {
    for (const block of blocks) {
      result.push({ ...block, _depth: depth } as Block & { _depth: number });
      if (block.children?.length) {
        walk(block.children, depth + 1);
      }
    }
  };
  walk(tree, 0);
  return result;
}

export function findBlockMeta(
  tree: Block[],
  blockId: string,
  depth = 0
): { block: Block; depth: number } | null {
  for (const block of tree) {
    if (block.id === blockId) {
      return { block, depth };
    }

    if (block.children?.length) {
      const nested = findBlockMeta(block.children, blockId, depth + 1);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

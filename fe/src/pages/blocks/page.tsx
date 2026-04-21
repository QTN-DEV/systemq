import { Plus, Settings2 } from "lucide-react";
import { useEffect, useRef, useState, type JSX } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Block, BlockCreatePayload, BlockStatus, BlockUpdatePayload } from "@/types/block-type";

import { BlockConfigurationSheet } from "./_forms/BlockConfigurationSheet";
import { BlockFormSheet } from "./_forms/BlockFormSheet";
import { useBlockLevelConfig } from "./_hooks/useBlockLevelConfig";
import { findBlockMeta, useBlockTree } from "./_hooks/useBlockTree";
import { BlockDetailPanel } from "./_sections/BlockDetailPanel";
import { BlockOutlineSection } from "./_sections/BlockOutlineSection";
import { GanttSection } from "./_sections/GanttSection";

export default function BlocksPage(): JSX.Element {
  const { tree, loading, create, update, remove } = useBlockTree();
  const { levelNames, replaceLevelNames, resetLevelNames, getLevelLabel } = useBlockLevelConfig();

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const outlineScrollHostRef = useRef<HTMLDivElement | null>(null);
  const ganttScrollHostRef = useRef<HTMLDivElement | null>(null);

  const selectedMeta = selectedBlockId ? findBlockMeta(tree, selectedBlockId) : null;
  const selectedBlock = selectedMeta?.block ?? null;
  const selectedDepth = selectedMeta?.depth ?? 0;
  const parentMeta = newParentId ? findBlockMeta(tree, newParentId) : null;
  const editingMeta = editingBlock ? findBlockMeta(tree, editingBlock.id) : null;
  const formDepth = editingMeta?.depth ?? (parentMeta ? parentMeta.depth + 1 : 0);

  const handleNewRoot = (): void => {
    setEditingBlock(null);
    setNewParentId(null);
    setFormOpen(true);
  };

  const handleNewChild = (block: Block): void => {
    setEditingBlock(null);
    setNewParentId(block.id);
    setFormOpen(true);
  };

  const handleSelect = (block: Block): void => {
    setSelectedBlockId((prev) => (prev === block.id ? null : block.id));
  };

  const handleUpdateBlock = async (
    blockId: string,
    payload: BlockUpdatePayload
  ): Promise<void> => {
    const updated = await update(blockId, payload);
    setSelectedBlockId(updated.id);
  };

  const handleStatusChange = async (block: Block, status: BlockStatus): Promise<void> => {
    if (block.status === status) return;
    await handleUpdateBlock(block.id, { status });
  };

  const handleFormSubmit = async (
    payload: BlockCreatePayload | BlockUpdatePayload
  ): Promise<void> => {
    if (editingBlock) {
      const updated = await update(editingBlock.id, payload as BlockUpdatePayload);
      setSelectedBlockId(updated.id);
    } else {
      const created = await create({ ...payload, parent_id: newParentId } as BlockCreatePayload);
      setSelectedBlockId(created.id);
    }
  };

  const handleDeleteRequest = (): void => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!selectedBlock) return;

    setDeleteLoading(true);
    try {
      await remove(selectedBlock.id);
      setSelectedBlockId(null);
      setDeleteDialogOpen(false);
      toast.success("Block deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete block");
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    const outlineViewport = outlineScrollHostRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null;
    const ganttViewport = ganttScrollHostRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null;

    if (!outlineViewport || !ganttViewport) return;

    let syncing = false;

    const syncScroll =
      (source: HTMLElement, target: HTMLElement) =>
      (): void => {
        if (syncing) return;
        syncing = true;
        target.scrollTop = source.scrollTop;
        window.requestAnimationFrame(() => {
          syncing = false;
        });
      };

    const syncFromOutline = syncScroll(outlineViewport, ganttViewport);
    const syncFromGantt = syncScroll(ganttViewport, outlineViewport);

    outlineViewport.addEventListener("scroll", syncFromOutline);
    ganttViewport.addEventListener("scroll", syncFromGantt);
    ganttViewport.scrollTop = outlineViewport.scrollTop;

    return (): void => {
      outlineViewport.removeEventListener("scroll", syncFromOutline);
      ganttViewport.removeEventListener("scroll", syncFromGantt);
    };
  }, [tree, selectedBlockId]);

  const nextLevelLabel = getLevelLabel(selectedDepth + 1) || `Level ${selectedDepth + 2}`;
  const formLevelLabel = getLevelLabel(formDepth) || `Level ${formDepth + 1}`;
  const parentLevelLabel = parentMeta
    ? getLevelLabel(parentMeta.depth) || `Level ${parentMeta.depth + 1}`
    : null;
  const selectedHasChildren = (selectedBlock?.children?.length ?? 0) > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-background flex-shrink-0">
        <h1 className="text-base font-semibold">Project Management</h1>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfigurationOpen(true)}
          className="h-8 gap-1.5"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Project Configuration
        </Button>
        <Button size="sm" onClick={handleNewRoot} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Block
        </Button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Tree outline */}
        <div className="w-64 flex-shrink-0 overflow-hidden">
          <BlockOutlineSection
            tree={tree}
            loading={loading}
            selectedId={selectedBlockId}
            onSelect={handleSelect}
            onNew={handleNewRoot}
            getLevelLabel={getLevelLabel}
            onStatusChange={handleStatusChange}
            scrollHostRef={outlineScrollHostRef}
          />
        </div>

        {/* Center: Gantt */}
        <div className="flex-1 flex overflow-hidden">
          <GanttSection
            tree={tree}
            selectedId={selectedBlockId}
            onSelect={handleSelect}
            scrollHostRef={ganttScrollHostRef}
          />
        </div>

        {/* Right: Detail panel */}
        {selectedBlock && (
          <BlockDetailPanel
            block={selectedBlock}
            nextLevelLabel={`Add ${nextLevelLabel}`}
            onClose={() => setSelectedBlockId(null)}
            onAddChild={handleNewChild}
            onUpdate={handleUpdateBlock}
            onDeleteRequest={handleDeleteRequest}
          />
        )}
      </div>

      {/* Form sheet */}
      <BlockFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        block={editingBlock}
        parentId={newParentId}
        levelLabel={formLevelLabel}
        parentLevelLabel={parentLevelLabel}
        onSubmit={handleFormSubmit}
      />
      <BlockConfigurationSheet
        open={configurationOpen}
        onOpenChange={setConfigurationOpen}
        levelNames={levelNames}
        onSave={replaceLevelNames}
        onReset={resetLevelNames}
      />

      <AlertDialog
        open={deleteDialogOpen && Boolean(selectedBlock)}
        onOpenChange={(open) => {
          if (deleteLoading) return;
          setDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Block</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBlock ? (
                <>
                  Are you sure you want to delete &quot;{selectedBlock.title}&quot;?
                  {selectedHasChildren ? " Children will also be deleted recursively." : ""} This
                  action cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleDeleteConfirm();
              }}
              disabled={deleteLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

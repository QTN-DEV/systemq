import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Block, BlockCreatePayload, BlockUpdatePayload } from "@/types/block-type";

import { BlockFormSheet } from "./_forms/BlockFormSheet";
import { useBlockTree } from "./_hooks/useBlockTree";
import { BlockOutlineSection } from "./_sections/BlockOutlineSection";
import { BlockDetailPanel } from "./_sections/BlockDetailPanel";
import { GanttSection } from "./_sections/GanttSection";

export default function BlocksPage() {
  const { tree, loading, create, update, remove } = useBlockTree();

  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [newParentId, setNewParentId] = useState<string | null>(null);

  const handleNewRoot = () => {
    setEditingBlock(null);
    setNewParentId(null);
    setFormOpen(true);
  };

  const handleEdit = (block: Block) => {
    setEditingBlock(block);
    setFormOpen(true);
  };

  const handleSelect = (block: Block) => {
    setSelectedBlock((prev) => (prev?.id === block.id ? null : block));
  };

  const handleFormSubmit = async (payload: BlockCreatePayload | BlockUpdatePayload) => {
    if (editingBlock) {
      const updated = await update(editingBlock.id, payload as BlockUpdatePayload);
      setSelectedBlock(updated);
    } else {
      await create({ ...payload, parent_id: newParentId } as BlockCreatePayload);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-background flex-shrink-0">
        <h1 className="text-base font-semibold">Block Manager</h1>
        <div className="flex-1" />
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
            selectedId={selectedBlock?.id ?? null}
            onSelect={handleSelect}
            onNew={handleNewRoot}
          />
        </div>

        {/* Center: Gantt */}
        <div className="flex-1 flex overflow-hidden">
          <GanttSection
            tree={tree}
            selectedId={selectedBlock?.id ?? null}
            onSelect={handleSelect}
          />
        </div>

        {/* Right: Detail panel */}
        {selectedBlock && (
          <BlockDetailPanel
            block={selectedBlock}
            onClose={() => setSelectedBlock(null)}
            onEdit={handleEdit}
          />
        )}
      </div>

      {/* Form sheet */}
      <BlockFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        block={editingBlock}
        parentId={newParentId}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

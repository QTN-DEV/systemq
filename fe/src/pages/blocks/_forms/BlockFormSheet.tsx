import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Block, BlockCreatePayload, BlockUpdatePayload } from "@/types/block-type";

type FormValues = {
  title: string;
  description: string;
  status: string;
  start_date: string;
  deadline: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block?: Block | null;
  parentId?: string | null;
  onSubmit: (payload: BlockCreatePayload | BlockUpdatePayload) => Promise<void>;
}

export function BlockFormSheet({ open, onOpenChange, block, parentId, onSubmit }: Props) {
  const isEdit = !!block;

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      status: "triage",
      start_date: "",
      deadline: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: block?.title ?? "",
        description: block?.description ?? "",
        status: block?.status ?? "triage",
        start_date: block?.start_date ? block.start_date.slice(0, 10) : "",
        deadline: block?.deadline ? block.deadline.slice(0, 10) : "",
      });
    }
  }, [open, block, reset]);

  const onFormSubmit = async (values: FormValues) => {
    const payload: BlockCreatePayload | BlockUpdatePayload = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      status: values.status as BlockCreatePayload["status"],
      start_date: values.start_date ? new Date(values.start_date).toISOString() : null,
      deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
      ...(!isEdit && parentId !== undefined ? { parent_id: parentId } : {}),
    };
    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{isEdit ? "Edit Block" : "New Block"}</SheetTitle>
        </SheetHeader>

        <form
          className="flex flex-col flex-1 overflow-y-auto px-6 py-4 gap-4"
          onSubmit={(e) => void handleSubmit(onFormSubmit)(e)}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Title *</label>
            <input
              {...register("title", { required: true })}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Block title..."
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <select
              {...register("status")}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="triage">Triage</option>
              <option value="backlog">Backlog</option>
              <option value="todo">Todo</option>
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                {...register("start_date")}
                className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Deadline</label>
              <input
                type="date"
                {...register("deadline")}
                className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              {...register("description")}
              rows={4}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex gap-2 pt-2 mt-auto">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Block"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

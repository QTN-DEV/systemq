import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createWorkspaceWorkflowWorkspaceV2WorkspaceIdWorkflowsPostMutation } from "@/api";
import type { WorkflowCreate } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(128),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkflowCreateDialogProps = {
  workspaceId: string;
  children?: React.ReactNode;
  className?: string;
  onSuccess?: (slug: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkflowCreateDialog(props: WorkflowCreateDialogProps) {
  const { workspaceId, children, className, onSuccess } = props;

  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

  const createMutation = useMutation({
    ...createWorkspaceWorkflowWorkspaceV2WorkspaceIdWorkflowsPostMutation(),
    onSuccess: (res, variables) => {
      if (!res.success) {
        toast.error("Could not create workflow");
        return;
      }
      toast.success("Workflow created");
      setOpen(false);
      reset();
      const slug = (variables.body.id || variables.body.name)
        .trim()
        .toLowerCase()
        .replace(/ /g, "-");
      onSuccess?.(slug);
    },
    onError: () => toast.error("Could not create workflow"),
  });

  const onSubmit = (values: FormValues) => {
    const body: WorkflowCreate = {
      name: values.name,
      description: values.description || undefined,
      prompt_template: "",
      version: 1,
      inputs: [],
      allowed_tools: [],
      disallowed_tools: [],
      mcp_servers: {},
    };
    createMutation.mutate({ path: { workspace_id: workspaceId }, body });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const isPending = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild={!!children} className={cn(className)}>
        {children ?? (
          <Button size="sm" type="button">
            <Plus className="mr-1 h-3.5 w-3.5" />
            New workflow
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New workflow</DialogTitle>
        </DialogHeader>

        <form
          id="create-workflow-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-workflow-name">Name *</Label>
            <Input
              id="new-workflow-name"
              placeholder="e.g. Daily Report"
              disabled={isPending}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-workflow-desc">Description (optional)</Label>
            <Input
              id="new-workflow-desc"
              placeholder="What does this workflow do?"
              disabled={isPending}
              {...register("description")}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="create-workflow-form" disabled={isPending}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

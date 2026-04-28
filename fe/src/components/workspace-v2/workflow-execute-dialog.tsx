import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  getWorkspaceWorkflowWorkspaceV2WorkspaceIdWorkflowsNameGetOptions,
} from "@/api";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkflowExecuteDialogProps = {
  workspaceId: string;
  workflowName: string;
  workflowDisplayName?: string;
  /** Called with filled-in input values when the user confirms execution. */
  onExecute?: (values: Record<string, string>) => void;
  children?: React.ReactNode;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkflowExecuteDialog(props: WorkflowExecuteDialogProps) {
  const {
    workspaceId,
    workflowName,
    workflowDisplayName,
    onExecute,
    children,
    className,
  } = props;

  const [open, setOpen] = useState(false);

  // Load full workflow data (inputs) when dialog opens
  const { data, isLoading } = useQuery({
    ...getWorkspaceWorkflowWorkspaceV2WorkspaceIdWorkflowsNameGetOptions({
      path: { workspace_id: workspaceId, name: workflowName },
    }),
    enabled: open,
  });

  const wf = data?.result;
  const inputs = wf?.inputs ?? [];

  // Build a dynamic zod schema from the workflow inputs
  const schema = z.object(
    Object.fromEntries(
      inputs.map((inp) => [inp.name, z.string().optional().default("")])
    )
  );

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(
      inputs.map((inp) => [
        inp.name,
        inp.default != null ? String(inp.default) : "",
      ])
    ),
  });

  const onSubmit = (values: FormValues) => {
    const filled: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      filled[k] = String(v ?? "");
    }
    onExecute?.(filled);
    toast.success(`Workflow "${workflowDisplayName ?? workflowName}" executed`);
    setOpen(false);
    reset();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild={!!children} className={cn(className)}>
        {children ?? (
          <Button
            onClick={() => {
              console.log("asdasdsad")
            }}
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            type="button"
          >
            <Play className="h-3 w-3" />
            Run
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Run — {workflowDisplayName ?? workflowName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-muted-foreground py-4 text-sm">Loading workflow…</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} id="execute-workflow-form">
            {inputs.length === 0 ? (
              <p className="text-muted-foreground py-2 text-sm">
                This workflow has no inputs. Click <strong>Run</strong> to execute.
              </p>
            ) : (
              <div className="space-y-4 py-1">
                {inputs.map((inp) => (
                  <div key={inp.name} className="space-y-1.5">
                    <Label htmlFor={`exec-${inp.name}`}>
                      {inp.label ?? inp.name}
                    </Label>
                    {inp.type === "textarea" ? (
                      <Textarea
                        id={`exec-${inp.name}`}
                        placeholder={inp.placeholder ?? ""}
                        rows={3}
                        {...register(inp.name as keyof FormValues)}
                      />
                    ) : (
                      <Input
                        id={`exec-${inp.name}`}
                        type={inp.type ?? "text"}
                        placeholder={inp.placeholder ?? ""}
                        {...register(inp.name as keyof FormValues)}
                      />
                    )}
                    {errors[inp.name as keyof FormValues] && (
                      <p className="text-destructive text-xs">
                        {String(
                          (errors[inp.name as keyof FormValues] as { message?: string })
                            ?.message ?? ""
                        )}
                      </p>
                    )}
                    {inp.default != null && (
                      <p className="text-muted-foreground text-[11px]">
                        Default: {String(inp.default)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </form>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="execute-workflow-form"
            disabled={isLoading}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

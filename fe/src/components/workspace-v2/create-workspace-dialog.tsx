import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import {
  createWorkspaceWorkspaceV2CreatePostMutation,
  getWorkspacesWorkspaceV2ListGetQueryKey,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const createWorkspaceFormSchema = z.object({
  name: z
    .string()
    .refine((s) => s.trim().length > 0, { message: "Name is required" }),
});

type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceFormSchema>;

export type CreateWorkspaceDialogProps = {
  className?: string;
  children: ReactNode;
  /** Fires after a workspace is created and the list has been refreshed. Defaults to navigating to the new workspace. */
  onSuccess?: (workspaceId: string) => void;
};

export function CreateWorkspaceDialog(props: CreateWorkspaceDialogProps): ReactElement {
  const { className, children, onSuccess } = props;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceFormSchema),
    defaultValues: { name: "" },
  });

  const createMutation = useMutation({
    ...createWorkspaceWorkspaceV2CreatePostMutation(),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error("Could not create workspace");
        return;
      }
      const id = res.result?.id;
      toast.success("Workspace created");
      setOpen(false);
      form.reset({ name: "" });
      void queryClient.invalidateQueries({ queryKey: getWorkspacesWorkspaceV2ListGetQueryKey() });
      if (id) {
        if (onSuccess) {
          onSuccess(id);
        } else {
          navigate(`/workspace-v2/${id}/files`);
        }
      }
    },
    onError: () => {
      toast.error("Could not create workspace");
    },
  });

  const onSubmit = (values: CreateWorkspaceFormValues): void => {
    createMutation.mutate({ body: { name: values.name.trim() } });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset({ name: "" });
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={cn(className)}>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-0"
          >
            <DialogHeader>
              <DialogTitle>New workspace (v2)</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="My workspace"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

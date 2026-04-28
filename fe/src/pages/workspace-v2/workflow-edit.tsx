import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import {
  getWorkspaceWorkflowWorkspaceV2WorkspaceIdWorkflowsNameGetOptions,
  listWorkspaceWorkflowsWorkspaceV2WorkspaceIdWorkflowsGetQueryKey,
  updateWorkspaceWorkflowWorkspaceV2WorkspaceIdWorkflowsNamePutMutation,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const workflowInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  label: z.string().optional(),
  type: z.string().default("text"),
  placeholder: z.string().optional(),
  default: z.string().optional(),
});

const formSchema = z.object({
  display_name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  version: z.coerce.number().int().min(1).default(1),
  model: z.string().optional(),
  max_turns: z.coerce.number().int().positive().optional().or(z.literal("")),
  max_budget_usd: z.coerce.number().positive().optional().or(z.literal("")),
  prompt_template: z.string().default(""),
  allowed_tools: z.array(z.string()).default([]),
  disallowed_tools: z.array(z.string()).default([]),
  inputs: z.array(workflowInputSchema).default([]),
});

type FormValues = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Tag input (for allowed/disallowed tools)
// ---------------------------------------------------------------------------

type TagInputProps = {
  value: string[];
  onChange: (v: string[]) => void;
  id: string;
  placeholder?: string;
  disabled?: boolean;
};

function TagInput({ id, value, onChange, placeholder, disabled }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={disabled || !draft.trim()}
        >
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span
              key={t}
              className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs"
            >
              {t}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x !== t))}
                  className="text-muted-foreground hover:text-destructive ml-0.5"
                  aria-label={`Remove ${t}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export type WorkspaceV2WorkflowEditPageProps = {
  className?: string;
};

export default function WorkspaceV2WorkflowEditPage(
  props: WorkspaceV2WorkflowEditPageProps,
): ReactElement {
  const { className } = props;
  const { workspaceId, workflowName } = useParams<{
    workspaceId: string;
    workflowName: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const wsId = workspaceId?.trim() ?? "";
  const wfName = workflowName?.trim() ?? "";

  // ---------- form ----------
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      display_name: "",
      description: "",
      version: 1,
      model: "",
      max_turns: "",
      max_budget_usd: "",
      prompt_template: "",
      allowed_tools: [],
      disallowed_tools: [],
      inputs: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "inputs" });

  // ---------- load ----------
  const { data, isLoading, isError } = useQuery({
    ...getWorkspaceWorkflowWorkspaceV2WorkspaceIdWorkflowsNameGetOptions({
      path: { workspace_id: wsId, name: wfName },
    }),
    enabled: Boolean(wsId && wfName),
  });

  const wf = data?.result;

  // Populate form once data arrives
  useEffect(() => {
    if (!wf) return;
    reset({
      display_name: wf.display_name ?? "",
      description: wf.description ?? "",
      version: Number(wf.version ?? 1),
      model: wf.model ?? "",
      max_turns: wf.max_turns != null ? wf.max_turns : ("" as unknown as number),
      max_budget_usd:
        wf.max_budget_usd != null ? wf.max_budget_usd : ("" as unknown as number),
      prompt_template: wf.prompt_template ?? "",
      allowed_tools: wf.allowed_tools ?? [],
      disallowed_tools: wf.disallowed_tools ?? [],
      inputs: (wf.inputs ?? []).map((inp) => ({
        name: inp.name ?? "",
        label: inp.label ?? "",
        type: inp.type ?? "text",
        placeholder: inp.placeholder ?? "",
        default: inp.default != null ? String(inp.default) : "",
      })),
    });
  }, [wf, reset]);

  // ---------- save ----------
  const saveMutation = useMutation({
    ...updateWorkspaceWorkflowWorkspaceV2WorkspaceIdWorkflowsNamePutMutation(),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error("Could not save workflow");
        return;
      }
      toast.success("Workflow saved");
      void queryClient.invalidateQueries({
        queryKey: listWorkspaceWorkflowsWorkspaceV2WorkspaceIdWorkflowsGetQueryKey({
          path: { workspace_id: wsId },
        }),
      });
      // Reset dirty state to current values
      reset(undefined, { keepValues: true });
    },
    onError: () => toast.error("Could not save workflow"),
  });

  const onSubmit = (values: FormValues) => {
    if (!wsId || !wfName) return;
    saveMutation.mutate({
      path: { workspace_id: wsId, name: wfName },
      body: {
        name: values.display_name,
        description: values.description || undefined,
        version: values.version,
        model: values.model || undefined,
        max_turns: values.max_turns !== "" ? Number(values.max_turns) : undefined,
        max_budget_usd:
          values.max_budget_usd !== "" ? Number(values.max_budget_usd) : undefined,
        prompt_template: values.prompt_template,
        allowed_tools: values.allowed_tools,
        disallowed_tools: values.disallowed_tools,
        inputs: values.inputs.map((inp) => ({
          name: inp.name,
          label: inp.label || undefined,
          type: inp.type || "text",
          placeholder: inp.placeholder || undefined,
          default: inp.default || undefined,
        })),
      },
    });
  };

  const backHref = wsId ? `/workspace-v2/${wsId}/workflows` : "/workspace-v2";
  const isPending = saveMutation.isPending;

  // ---------- guard ----------
  if (!workspaceId || !workflowName) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center gap-3 p-8",
          className,
        )}
      >
        <p className="text-muted-foreground text-sm">Missing workspace or workflow.</p>
        <Button variant="outline" asChild>
          <Link to="/workspace-v2">Back</Link>
        </Button>
      </div>
    );
  }

  // ---------- render ----------
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex h-full min-h-0 flex-col", className)}
    >
      {/* Toolbar */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b bg-background px-4 py-2.5">
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" asChild>
          <Link to={backHref}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Workflows
          </Link>
        </Button>
        <h1 className="text-base font-semibold">
          {isLoading ? "Loading…" : (wf?.display_name ?? wfName)}
        </h1>
        <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px]">
          workflows/{wfName}.yaml
        </span>
        {isDirty && (
          <span className="text-muted-foreground text-xs">Unsaved changes</span>
        )}
        <Button type="submit" size="sm" className="h-8" disabled={isPending || isLoading}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-muted-foreground p-6 text-sm">Loading…</p>
        ) : isError ? (
          <p className="text-destructive p-6 text-sm">Could not load workflow.</p>
        ) : (
          <div className="mx-auto max-w-2xl space-y-8 p-6">

            {/* Basic */}
            <section className="space-y-4">
              <h2 className="text-foreground text-sm font-semibold uppercase tracking-wider">
                Basic
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="wf-name">Name *</Label>
                  <Input
                    id="wf-name"
                    placeholder="My Workflow"
                    disabled={isPending}
                    {...register("display_name")}
                  />
                  {errors.display_name && (
                    <p className="text-destructive text-xs">{errors.display_name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wf-id">ID (slug)</Label>
                  <Input
                    id="wf-id"
                    value={wf?.id ?? wfName}
                    readOnly
                    className="bg-muted/50 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wf-desc">Description</Label>
                <Input
                  id="wf-desc"
                  placeholder="Short description of what this workflow does"
                  disabled={isPending}
                  {...register("description")}
                />
              </div>
            </section>

            <Separator />

            {/* Model & limits */}
            <section className="space-y-4">
              <h2 className="text-foreground text-sm font-semibold uppercase tracking-wider">
                Model & Limits
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wf-version">Version</Label>
                  <Input
                    id="wf-version"
                    type="number"
                    disabled={isPending}
                    {...register("version")}
                  />
                  {errors.version && (
                    <p className="text-destructive text-xs">{errors.version.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wf-max-turns">Max Turns</Label>
                  <Input
                    id="wf-max-turns"
                    type="number"
                    placeholder="e.g. 10"
                    disabled={isPending}
                    {...register("max_turns")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wf-budget">Max Budget (USD)</Label>
                  <Input
                    id="wf-budget"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 0.50"
                    disabled={isPending}
                    {...register("max_budget_usd")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wf-model">Model</Label>
                <Input
                  id="wf-model"
                  placeholder="claude-sonnet-4-20250514"
                  disabled={isPending}
                  {...register("model")}
                />
              </div>
            </section>

            <Separator />

            {/* Prompt */}
            <section className="space-y-4">
              <h2 className="text-foreground text-sm font-semibold uppercase tracking-wider">
                Prompt Template
              </h2>
              <p className="text-muted-foreground text-xs">
                Use{" "}
                <code className="bg-muted rounded px-1">{"{variable_name}"}</code> to
                reference input values.
              </p>
              <textarea
                id="wf-prompt"
                rows={10}
                disabled={isPending}
                placeholder="Perform research on: {location}…"
                className={cn(
                  "w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-sm text-foreground",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
                {...register("prompt_template")}
              />
            </section>

            <Separator />

            {/* Inputs */}
            <section className="space-y-4">
              <h2 className="text-foreground text-sm font-semibold uppercase tracking-wider">
                Inputs
              </h2>

              {fields.map((field, i) => (
                <div
                  key={field.id}
                  className="bg-muted/40 border-border rounded-lg border p-3"
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Name *</Label>
                      <Input
                        placeholder="variable_name"
                        disabled={isPending}
                        {...register(`inputs.${i}.name`)}
                      />
                      {errors.inputs?.[i]?.name && (
                        <p className="text-destructive text-xs">
                          {errors.inputs[i]?.name?.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        placeholder="Display Label"
                        disabled={isPending}
                        {...register(`inputs.${i}.label`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Input
                        placeholder="text"
                        disabled={isPending}
                        {...register(`inputs.${i}.type`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Placeholder</Label>
                      <Input
                        disabled={isPending}
                        {...register(`inputs.${i}.placeholder`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Default</Label>
                      <Input
                        disabled={isPending}
                        {...register(`inputs.${i}.default`)}
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive h-7 text-xs"
                      disabled={isPending}
                      onClick={() => remove(i)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  append({ name: "", label: "", type: "text", placeholder: "", default: "" })
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add input
              </Button>
            </section>

            <Separator />

            {/* Tools */}
            <section className="space-y-4">
              <h2 className="text-foreground text-sm font-semibold uppercase tracking-wider">
                Tools
              </h2>
              <div className="space-y-1.5">
                <Label htmlFor="wf-allowed-tools">Allowed Tools</Label>
                <Controller
                  control={control}
                  name="allowed_tools"
                  render={({ field }) => (
                    <TagInput
                      id="wf-allowed-tools"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="e.g. Read, Write, WebSearch"
                      disabled={isPending}
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wf-disallowed-tools">Disallowed Tools</Label>
                <Controller
                  control={control}
                  name="disallowed_tools"
                  render={({ field }) => (
                    <TagInput
                      id="wf-disallowed-tools"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="e.g. Bash"
                      disabled={isPending}
                    />
                  )}
                />
              </div>
            </section>

            {/* Bottom save */}
            <div className="flex justify-end pb-8">
              <Button type="submit" disabled={isPending || isLoading}>
                {isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

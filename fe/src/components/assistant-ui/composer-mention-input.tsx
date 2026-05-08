"use client";

import { getMentionOnSelectItem } from "@platejs/mention";
import { useQuery } from "@tanstack/react-query";
import { FileIcon, ForwardIcon, HashIcon, SlashIcon, UserIcon, ZapIcon } from "lucide-react";
import {
  IS_APPLE,
  KEYS,
  type TComboboxInputElement,
  type TMentionElement,
} from "platejs";
import {
  PlateElement,
  type PlateElementProps,
  useFocused,
  useReadOnly,
  useSelected,
} from "platejs/react";
import * as React from "react";

import { getWorkspaceMentionablesOptions } from "@/api/__generated__/@tanstack/react-query.gen";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from "../ui/inline-combobox";

import { useWorkspaceId } from "./workspace-id-context";

const MENTION_CONFIG = {
  filenames: {
    icon: <FileIcon size={12} />,
    style: "bg-amber-50 text-amber-700 border-amber-200/50",
  },
  peoples: {
    icon: <UserIcon size={12} />,
    style: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
  },
  skills: {
    icon: <ZapIcon size={12} />,
    style: "bg-rose-50 text-rose-700 border-rose-200/50",
  },
  default: {
    icon: <HashIcon size={12} />,
    style: "bg-slate-50 text-slate-700 border-slate-200/50",
  },
} as const;

export function ComposerMentionElement(
  props: PlateElementProps<TMentionElement> & {
    prefix?: string;
  },
) {
  const { element, children, attributes } = props;
  const selected = useSelected();
  const focused = useFocused();
  const mounted = useMounted();
  const readOnly = useReadOnly();

  const [typeKey] = String(element.key ?? "").split("-");
  const config =
    MENTION_CONFIG[typeKey as keyof typeof MENTION_CONFIG] ??
    MENTION_CONFIG.default;

  const label = (
    <span
      className={cn("min-w-0", typeKey === "filenames" && "truncate")}
      title={typeKey === "filenames" ? element.value : undefined}
    >
      {props.prefix}
      {element.value}
    </span>
  );

  return (
    <PlateElement
      {...props}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border px-1.5 py-0.5 align-baseline font-medium text-sm transition-colors",
        config.style,
        !readOnly && "cursor-pointer",
        selected && focused && "ring-2 ring-ring ring-offset-1",
        element.children[0][KEYS.bold] === true && "font-bold",
        element.children[0][KEYS.italic] === true && "italic",
        element.children[0][KEYS.underline] === true && "underline",
        typeKey === "filenames" && "max-w-64",
      )}
      attributes={{
        ...attributes,
        contentEditable: false,
        "data-slate-value": element.value,
        draggable: true,
      }}
    >
      <span className="flex-shrink-0 opacity-80">{config.icon}</span>
      {mounted && IS_APPLE ? (
        <>
          {children}
          {label}
        </>
      ) : (
        <>
          {label}
          {children}
        </>
      )}
    </PlateElement>
  );
}

const onSelectItem = getMentionOnSelectItem();

export function ComposerMentionInputElement(
  props: PlateElementProps<TComboboxInputElement>,
) {
  const { editor, element, children } = props;
  const [search, setSearch] = React.useState("");
  const workspaceId = useWorkspaceId();

  const { data, isLoading } = useQuery({
    ...getWorkspaceMentionablesOptions({
      path: { workspace_id: workspaceId ?? "" },
    }),
    enabled: Boolean(workspaceId),
    gcTime: 0,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const categories = data?.result?.categories ?? {};

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox
        value={search}
        element={element}
        setValue={setSearch}
        showTrigger={false}
        trigger="@"
      >
        <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 align-baseline text-sm ring-ring focus-within:ring-2">
          <InlineComboboxInput placeholder="Type to search..." />
        </span>

        <InlineComboboxContent className="my-1.5 min-w-[240px]">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-muted-foreground text-xs">
              <span className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Searching...
            </div>
          ) : (
            <>
              <InlineComboboxEmpty>No results</InlineComboboxEmpty>

              {Object.entries(categories).map(([category, { items }]) => {
                const lowerCategory = category.toLowerCase();
                const isFilename = lowerCategory === "filenames";
                const config =
                  MENTION_CONFIG[
                    lowerCategory as keyof typeof MENTION_CONFIG
                  ] ?? MENTION_CONFIG.default;

                return (
                  <InlineComboboxGroup key={category}>
                    <InlineComboboxGroupLabel className="flex items-center gap-2 capitalize">
                      {config.icon}
                      {category}
                    </InlineComboboxGroupLabel>

                    {items.map((item) => (
                      <InlineComboboxItem
                        key={`${category}-${item.key}`}
                        value={item.text}
                        className={cn(isFilename && "max-w-[292px]")}
                        title={isFilename ? item.text : undefined}
                        onClick={() =>
                          onSelectItem(
                            editor,
                            {
                              ...item,
                              key: `${lowerCategory}-${item.key}`,
                            },
                            search,
                          )
                        }
                      >
                        <span
                          className={cn(
                            "min-w-0",
                            isFilename && "truncate text-xs",
                          )}
                        >
                          {item.text}
                        </span>
                      </InlineComboboxItem>
                    ))}
                  </InlineComboboxGroup>
                );
              })}
            </>
          )}
        </InlineComboboxContent>
      </InlineCombobox>

      {children}
    </PlateElement>
  );
}

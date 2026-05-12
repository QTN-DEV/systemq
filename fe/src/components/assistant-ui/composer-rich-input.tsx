"use client";

import { useAui, useAuiState } from "@assistant-ui/react";
import { flushResourcesSync } from "@assistant-ui/tap";
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  CodePlugin,
} from "@platejs/basic-nodes/react";
import { MentionInputPlugin, MentionPlugin } from "@platejs/mention/react";
import { BoldIcon, ItalicIcon, UnderlineIcon, CodeIcon } from "lucide-react";
import { Plate, usePlateEditor, PlateContent } from "platejs/react";
import {
  useCallback,
  useEffect,
  useRef,
  type ElementType,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";

import {
  ComposerMentionElement,
  ComposerMentionInputElement,
} from "./composer-mention-input";
import { WorkspaceIdContext } from "./workspace-id-context";

type MarkPlugin = {
  key: string;
};

type ComposerLeaf = {
  key?: string;
  text?: string;
  type?: string;
  value?: string;
};

type ComposerNode = {
  children?: ComposerLeaf[];
};

type ComposerEditor = {
  api: {
    marks: () => Record<string, unknown> | null | undefined;
  };
  children: ComposerNode[];
  tf: {
    focus: () => void;
    reset: () => void;
    toggleMark: (key: string) => void;
  };
};

const useMarkToolbar = (editor: ComposerEditor) => {
  const toggle = (plugin: MarkPlugin) => {
    editor.tf.toggleMark(plugin.key);
    editor.tf.focus();
  };
  const isActive = (plugin: MarkPlugin) => {
    const marks = editor.api.marks() ?? {};
    return marks[plugin.key] === true;
  };
  return { toggle, isActive };
};

const MarkButton = ({
  editor,
  plugin,
  icon: Icon,
  tooltip,
}: {
  editor: ComposerEditor;
  plugin: MarkPlugin;
  icon: ElementType;
  tooltip: string;
}) => {
  const { toggle, isActive } = useMarkToolbar(editor);
  return (
    <button
      type="button"
      title={tooltip}
      onMouseDown={(e) => {
        e.preventDefault();
        toggle(plugin);
      }}
      className={cn(
        "rounded p-1 transition-colors hover:bg-muted",
        isActive(plugin) ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
};

export const ComposerRichInput = ({
  workspaceId,
}: {
  workspaceId?: string;
}) => {
  const aui = useAui();
  const composerText = useAuiState((s) => s.composer.text);
  const isThreadLoading = useAuiState((s) => s.thread.isLoading);
  const previousComposerTextRef = useRef(composerText);

  const editor = usePlateEditor({
    plugins: [
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      CodePlugin,
      ...[
        MentionPlugin.configure({
          options: {
            triggerPreviousCharPattern: /^$|^[\s"']$/,
          },
        }).withComponent(ComposerMentionElement),
        MentionInputPlugin.withComponent(ComposerMentionInputElement),
      ],
    ],
  });

  const extractText = useCallback((ed: ComposerEditor) => {
    return ed.children
      .map(
        (node) =>
          node.children
            ?.map((leaf) => {
              if (leaf.type === "mention") {
                const [type] = leaf.key?.split("-") ?? [];
                return `@${type}:${leaf.value}`;
              }
              return leaf.text ?? "";
            })
            .join("") ?? "",
      )
      .join("\n");
  }, []);

  const syncComposerText = useCallback(
    (text: string) => {
      if (isThreadLoading) return;

      flushResourcesSync(() => {
        aui.composer().setText(text);
      });
    },
    [aui, isThreadLoading],
  );

  const handleChange = useCallback(
    ({ editor: ed }: { editor: ComposerEditor }) => {
      syncComposerText(extractText(ed));
    },
    [extractText, syncComposerText],
  );

  useEffect(() => {
    syncComposerText(extractText(editor));
  }, [editor, extractText, syncComposerText]);

  useEffect(() => {
    const previousComposerText = previousComposerTextRef.current;
    previousComposerTextRef.current = composerText;

    if (previousComposerText === "") return;
    if (composerText !== "") return;
    if (!extractText(editor)) return;

    editor.tf.reset();
  }, [composerText, editor, extractText]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    event.currentTarget.closest("form")?.requestSubmit();
  }, []);

  return (
    <WorkspaceIdContext.Provider value={workspaceId}>
      <Plate editor={editor} onChange={handleChange}>
        <div className="mb-1 flex items-center gap-0.5 border-b border-border/50 pb-1">
          <MarkButton
            editor={editor}
            plugin={BoldPlugin}
            icon={BoldIcon}
            tooltip="Bold (⌘B)"
          />
          <MarkButton
            editor={editor}
            plugin={ItalicPlugin}
            icon={ItalicIcon}
            tooltip="Italic (⌘I)"
          />
          <MarkButton
            editor={editor}
            plugin={UnderlinePlugin}
            icon={UnderlineIcon}
            tooltip="Underline (⌘U)"
          />
          <MarkButton
            editor={editor}
            plugin={CodePlugin}
            icon={CodeIcon}
            tooltip="Code (⌘E)"
          />
        </div>

        <PlateContent
          placeholder="Send a message..."
          className="aui-composer-input max-h-32 min-h-10 w-full resize-none bg-transparent px-1.75 py-1 text-sm outline-none placeholder:text-muted-foreground/80"
          aria-label="Message input"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onKeyDown={handleKeyDown}
          disableDefaultStyles
        />
      </Plate>
    </WorkspaceIdContext.Provider>
  );
};

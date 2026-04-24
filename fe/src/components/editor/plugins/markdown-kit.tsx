import {
  BaseFootnoteDefinitionPlugin,
  BaseFootnoteReferencePlugin,
} from "@platejs/footnote";
import { MarkdownPlugin, remarkMdx, remarkMention } from "@platejs/markdown";
import { KEYS } from "platejs";
import remarkEmoji from "remark-emoji";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// Which fenced-code langs should round-trip as code_drawing nodes
const DRAWING_LANGS = new Set(["mermaid", "excalidraw", "plantuml"]);

export const MarkdownKit = [
  BaseFootnoteReferencePlugin,
  BaseFootnoteDefinitionPlugin,
  MarkdownPlugin.configure({
    options: {
      plainMarks: [KEYS.suggestion, KEYS.comment],
      remarkPlugins: [
        remarkMath,
        remarkGfm,
        remarkEmoji as any,
        remarkMdx,
        remarkMention,
      ],
      rules: {
        code_drawing: {
          // Plate node → mdast
          serialize: (node: any) => {
            const lang = (node.data?.drawingType ?? "mermaid").toLowerCase();
            const value = node.data?.code ?? "";
            return {
              type: "code",
              lang,
              // Stash drawingMode so it survives round-trip
              meta: node.data?.drawingMode
                ? `drawingMode=${node.data.drawingMode}`
                : null,
              value,
            };
          },
          // mdast → Plate node
          deserialize: (mdastNode: any) => {
            const lang: string = mdastNode.lang ?? "";
            const drawingType =
              lang.charAt(0).toUpperCase() + lang.slice(1); // "mermaid" → "Mermaid"

            // Parse meta like `drawingMode=Both`
            let drawingMode = "Both";
            const match = /drawingMode=(\w+)/.exec(mdastNode.meta ?? "");
            if (match) drawingMode = match[1];

            return {
              type: "code_drawing",
              children: [{ text: "" }],
              data: {
                drawingType,
                drawingMode,
                code: mdastNode.value ?? "",
              },
            };
          },
        },

        // Intercept the default code block so ```mermaid ... ``` becomes
        // a code_drawing instead of a regular code block on deserialize
        code_block: {
          deserialize: (mdastNode: any, deco, options) => {
            if (DRAWING_LANGS.has((mdastNode.lang ?? "").toLowerCase())) {
              const lang = mdastNode.lang.toLowerCase();
              return {
                type: "code_drawing",
                children: [{ text: "" }],
                data: {
                  drawingType: lang.charAt(0).toUpperCase() + lang.slice(1),
                  drawingMode: /drawingMode=(\w+)/.exec(mdastNode.meta ?? "")?.[1] ?? "Both",
                  code: mdastNode.value ?? "",
                },
              };
            }
            // Fallback to default code-block shape
            return {
              type: KEYS.codeBlock,
              lang: mdastNode.lang ?? null,
              children: (mdastNode.value ?? "")
                .split("\n")
                .map((line: string) => ({
                  type: KEYS.codeLine,
                  children: [{ text: line }],
                })),
            };
          },
        },
      },
    },
  }),
];
import { BaseCodeDrawingPlugin } from "@platejs/code-drawing";

import { CodeDrawingElement } from "@/components/ui/code-drawing-node";

export const CodeDrawingKit = [
  BaseCodeDrawingPlugin.withComponent(CodeDrawingElement),
];

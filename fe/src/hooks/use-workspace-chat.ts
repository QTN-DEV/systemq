import { type ChatModelAdapter, useLocalRuntime } from "@assistant-ui/react";
import { useMemo } from "react";

// import { workspaceChatStreamWorkspaceV2WorkspaceIdChatsChatIdStreamPost as workspaceChatStream } from "@/api";
// import { mapAssistantStream } from "@/utils/map-assistant-stream";

export function useWorkspaceChatAdapter() {
  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages }) {
        // const response = await workspaceChatStream({
        //   path: {
        //     workspace_id: options.workspaceId,
        //     chat_id: options.chatId,
        //   },
        //   body: {
        //     messages: messages.map((m) => ({
        //       role: m.role,
        //       content: m.content
        //         .map((c) => (c.type === "text" ? c.text : ""))
        //         .join(""),
        //     })),
        //   },
        // });
        yield* []
      },
    }),
    [],
  );

  const runtime = useLocalRuntime(adapter, { initialMessages: [] });

  return runtime;
}

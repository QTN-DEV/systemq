import {
  type ChatModelAdapter,
  useLocalRuntime,
} from "@assistant-ui/react";
import { useMemo } from "react";

import { config } from "@/lib/config";
import { useAuthStore } from "@/stores/authStore";
import { mapAssistantStream, parseSSE } from "@/utils/map-assistant-stream";

import { useStore, useStoreApi } from "./use-store";

/**
 * Custom adapter that:
 * 1. Sends the current dashboard content as context alongside the message history.
 * 2. Intercepts `update_dashboard` tool calls and writes the new content into the store.
 * 3. Streams the rest of the AI response normally through assistant-ui.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useDashboardChatAdapter() {
  const storeApi = useStoreApi();
  const userId = useStore((state) => state.userId);

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        const { content } = storeApi.getState();

        const session = useAuthStore.getState().getCurrentSession();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(session?.token
            ? { Authorization: `Bearer ${session.token}` }
            : {}),
        };

        const response = await fetch(
          `${config.apiBaseUrl}/dashboard/chat/stream`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              messages: messages.map((m) => ({
                role: m.role,
                content: m.content
                  .map((c) => (c.type === "text" ? c.text : ""))
                  .join(""),
              })),
              current_content: content,
              user_id: userId,
            }),
            signal: abortSignal,
          },
        );

        let lastProcessedContent = "";
        for await (const update of mapAssistantStream(parseSSE(response))) {
          console.log({ update });
          // Intercept update_dashboard tool calls and write into the store
          const toolCall = update.content.find(
            (part: {
              type: string;
              toolName?: string;
              args?: { content?: string };
              result?: string;
            }) =>
              part.type === "tool-call" &&
              (part.toolName === "update_dashboard" ||
                part.toolName?.endsWith("__update_dashboard")),
          ) as
            | {
                type: string;
                toolName: string;
                args: { content: string };
                result?: string;
                toolCallId: string;
              }
            | undefined;

          // Prefer result content if available (final source), otherwise use streaming args
          const newContent = toolCall?.result || toolCall?.args?.content;

          if (newContent !== undefined && newContent !== lastProcessedContent) {
            lastProcessedContent = newContent;
            storeApi.setState((state) => ({
              ...state,
              content: newContent,
            }));
          }

          yield update;
        }
      },
    }),
    [storeApi, userId],
  );

  return useLocalRuntime(adapter);
}

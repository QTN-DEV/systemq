import { type ChatModelAdapter, useLocalRuntime } from "@assistant-ui/react";
import { useEffect, useMemo } from "react";

import { config } from "@/lib/config";
import { useAuthStore } from "@/stores/authStore";
import { mapAssistantStream, parseSSE } from "@/utils/map-assistant-stream";

function storageKeyFor(workspaceId: string): string {
  return `workspace_chat_messages_${workspaceId}`;
}

function loadInitialMessages(workspaceId: string): unknown[] {
  if (typeof window === "undefined" || !workspaceId) {
    return [];
  }
  try {
    const saved = localStorage.getItem(storageKeyFor(workspaceId));
    if (!saved) {
      return [];
    }
    const parsed = JSON.parse(saved) as unknown[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((msg: unknown) => {
      const m = msg as { content?: Array<{ type: string }> };
      return {
        ...m,
        content: (m.content ?? []).filter((part) => part.type !== "cost"),
      };
    });
  } catch (e) {
    console.error("Failed to parse workspace chat storage", e);
    return [];
  }
}

export function useWorkspaceChatAdapter(workspaceId: string) {
  const key = workspaceId.trim();

  const initialMessages = useMemo(() => loadInitialMessages(key), [key]);

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        if (!key) {
          return;
        }
        const session = useAuthStore.getState().getCurrentSession();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        };

        const response = await fetch(
          `${config.apiBaseUrl}/workspaces/${encodeURIComponent(key)}/chat/stream`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              messages: messages.map((m) => ({
                role: m.role,
                content: m.content.map((c) => (c.type === "text" ? c.text : "")).join(""),
              })),
            }),
            signal: abortSignal,
          },
        );

        yield* mapAssistantStream(parseSSE(response));
      },
    }),
    [key],
  );

  const runtime = useLocalRuntime(adapter, { initialMessages });

  useEffect(() => {
    if (!runtime || !key) {
      return;
    }
    const unsubscribe = runtime.thread.subscribe(() => {
      const currentMessages = runtime.thread.getState().messages;
      localStorage.setItem(storageKeyFor(key), JSON.stringify(currentMessages));
    });
    return unsubscribe;
  }, [runtime, key]);

  return runtime;
}

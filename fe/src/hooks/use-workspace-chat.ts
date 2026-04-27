import { type ChatModelAdapter, type RemoteThreadListAdapter, useLocalRuntime } from "@assistant-ui/react";
import { useMemo } from "react";

// import { workspaceChatStreamWorkspaceV2WorkspaceIdChatsChatIdStreamPost as workspaceChatStream } from "@/api";
// import { mapAssistantStream } from "@/utils/map-assistant-stream";

const myDatabaseAdapter: RemoteThreadListAdapter = {
  async list() {
    console.log('list')
    return []
  },

  async initialize(threadId) {
    console.log('thread init ' + threadId)
  },

  async rename(remoteId, newTitle) {
    console.log('thread rename ' + remoteId + ' ' + newTitle)
  },

  async archive(remoteId) {
    console.log('thread archive ' + remoteId)
  },

  async unarchive(remoteId) {
    console.log('thread unarchive ' + remoteId)
  },

  async delete(remoteId) {
    console.log('thread delete ' + remoteId)
  },

  async generateTitle(remoteId, unstable_messages) {
    console.log('thread generateTitle ' + remoteId + ' ' + JSON.stringify(unstable_messages))
  },
};


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

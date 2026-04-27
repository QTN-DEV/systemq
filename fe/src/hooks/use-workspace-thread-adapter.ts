import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import { useMemo } from "react";

import {
  listWorkspaceChatsWorkspaceV2WorkspaceIdChatsGet as listWorkspaceChats,
  createWorkspaceChatWorkspaceV2WorkspaceIdChatsPost as createWorkspaceChat,
} from "@/api";

export function useWorkspaceThreadAdapter(options: { workspaceId: string }) {
  const adapter = useMemo<RemoteThreadListAdapter>(
    () => ({
      async list() {
        console.log("list");
        const response = await listWorkspaceChats({
          path: {
            workspace_id: options.workspaceId,
          },
        });

        console.log("response", response);

        if (!response.data) {
          return { threads: [] };
        }

        return {
          threads:
            response.data.result?.map((chat) => ({
              remoteId: chat.id,
              // Your API currently just returns an ID. You can set a default title here.
              title: "Workspace Conversation",
              status: "regular",
            })) ?? [],
        };
      },
      initialize: async (threadId: string) => {
        console.log("asdads");
        console.log("threadId", threadId);
        return {
          remoteId: threadId,
          externalId: threadId,
        };
      },
      async delete(remoteId: string) { },
      async archive(remoteId: string) { },
      async unarchive(remoteId: string) { },
      async rename(remoteId: string, title: string) { },
      async fetch(remoteId: string) { },
      async generateTitle(remoteId: string) {
        console.log("generateTitle", remoteId);
        return {
          title: "Workspace Conversation",
        };
      },
    }),
    [options.workspaceId],
  );

  return adapter;
}

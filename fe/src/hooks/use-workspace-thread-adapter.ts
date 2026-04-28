import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import { useMemo } from "react";

import {
  listWorkspaceChatsWorkspaceV2WorkspaceIdChatsGet as listWorkspaceChats,
  deleteWorkspaceChatWorkspaceV2WorkspaceIdChatsChatIdDelete as deleteWorkspaceChat,
} from "@/api";

export function useWorkspaceThreadAdapter(options: { workspaceId: string }) {
  const adapter = useMemo<RemoteThreadListAdapter>(
    () => ({
      async list() {
        const response = await listWorkspaceChats({
          path: {
            workspace_id: options.workspaceId,
          },
        });

        if (!response.data) {
          return { threads: [] };
        }

        return {
          threads:
            response.data.result?.map((chat) => ({
              remoteId: chat.id,
              title: chat.title,
              status: "regular",
            })) ?? [],
        };
      },
      initialize: async (threadId: string) => {
        return {
          remoteId: threadId,
          externalId: threadId,
        };
      },
      async delete(remoteId: string) {
        await deleteWorkspaceChat({
          path: {
            workspace_id: options.workspaceId,
            chat_id: remoteId,
          }
        })
      },
      async archive(remoteId: string) {
        console.log({ remoteId })
        console.log("achiving " + remoteId)
      },
      async unarchive(remoteId: string) { },
      async rename(remoteId: string, title: string) { },
      async fetch(remoteId: string) {
        console.log({ remoteId })
        return {}
      },
      async generateTitle(remoteId: string) {
        console.log("generateTitle", remoteId);
        return {
          title: "Workspace Conversatioxxxn",
        };
      },
    }),
    [options.workspaceId],
  );

  return adapter;
}

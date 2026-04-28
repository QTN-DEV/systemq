import { AssistantRuntimeProvider, RuntimeAdapterProvider, useAui, useLocalRuntime, useRemoteThreadListRuntime, type AttachmentAdapter, type ChatModelAdapter, type CompleteAttachment, type PendingAttachment, type RemoteThreadListAdapter, type ThreadHistoryAdapter } from "@assistant-ui/react";
import { useMemo, type ReactElement } from "react";

import { Thread } from "../assistant-ui/thread";
import { ThreadList } from "../assistant-ui/thread-list";
import { deleteWorkspaceChatWorkspaceV2WorkspaceIdChatsChatIdDelete as deleteWorkspaceChat, getWorkspaceChatWorkspaceV2WorkspaceIdChatsChatIdGet, listWorkspaceChatsWorkspaceV2WorkspaceIdChatsGet, appendWorkspaceChatMessageWorkspaceV2WorkspaceIdChatsChatIdMessagesPost, workspaceChatStreamWorkspaceV2WorkspaceIdChatsChatIdStreamPost, createWorkspaceChatWorkspaceV2WorkspaceIdChatsPost, uploadFileToWorkspaceWorkspaceV2WorkspaceIdDriveUploadPost } from '@/api'
import { mapAssistantStream } from "@/utils/map-assistant-stream";
import { client } from "@/api/__generated__/client.gen";

type WorkspaceAssistantThreadProps = {
  workspaceId?: string | undefined;
};

export function WorkspaceAssistantThread({
  workspaceId
}: WorkspaceAssistantThreadProps): ReactElement {

  class VisionImageAdapter implements AttachmentAdapter {
    accept = "image/jpeg,image/png,image/webp,image/gif";

    async add({ file }: { file: File }): Promise<PendingAttachment> {
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        throw new Error("Image size exceeds 20MB limit");
      }

      return {
        id: crypto.randomUUID(),
        type: "image",
        name: file.name,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      };
    }

    async send(attachment: PendingAttachment): Promise<CompleteAttachment> {

      const { data } = await uploadFileToWorkspaceWorkspaceV2WorkspaceIdDriveUploadPost({
        path: {
          workspace_id: workspaceId as string,
        },
        body: {
          file: attachment.file,
          path: `/uploads/${crypto.randomUUID()}_${attachment.file.name}`
        }
      });

      return {
        id: attachment.id,
        type: "image",
        name: attachment.name,
        content: [
          {
            type: "image",
            image: `${client.getConfig().baseUrl}/workspace_v2/${workspaceId}/files/${encodeURIComponent(data?.result?.relative_path?.replace(/^\/+/, "") ?? "")}`,
          },
        ],
        status: { type: "complete" },
      };
    }

    async remove(attachment: PendingAttachment): Promise<void> {
    }

    private async fileToBase64DataURL(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }


  const myDatabaseAdapter: RemoteThreadListAdapter = {
    async list() {
      const res = await listWorkspaceChatsWorkspaceV2WorkspaceIdChatsGet({
        path: {
          workspace_id: workspaceId as string
        }
      })
      return {
        threads: res.data?.result?.map((t) => ({
          remoteId: t.id,
          title: t.title,
          status: 'regular',
          externalId: t.id
        })) || []
      }
    },

    async initialize(threadId) {
      console.log('thread init ' + threadId)
      const { data: chat } = await createWorkspaceChatWorkspaceV2WorkspaceIdChatsPost({
        path: {
          workspace_id: workspaceId as string
        },
        body: {
          title: 'Test ' + threadId
        }
      })

      return {
        remoteId: chat?.result?.id || 'asdsd',
        externalId: undefined,
      }
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
      await deleteWorkspaceChat({
        path: {
          chat_id: remoteId as string,
          workspace_id: workspaceId as string
        }
      })
    },

    async generateTitle(remoteId, unstable_messages) {
      console.log('thread generateTitle ' + remoteId + ' ' + JSON.stringify(unstable_messages))
    },
  };

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, unstable_threadId, context }) {

        console.log("sending to " + unstable_threadId)
        console.log(JSON.stringify({ send_message: messages }, null, 2))

        const response = await workspaceChatStreamWorkspaceV2WorkspaceIdChatsChatIdStreamPost({
          path: {
            chat_id: unstable_threadId as string,
            workspace_id: workspaceId as string
          },
          body: {
            messages: messages.map((m) => ({
              role: m.role,
              attachments: (m.attachments as any[]) || [],
              content: m.content
                .map((c) => (c.type === "text" ? c.text : ""))
                .join(""),
            })),
          },
        });
        yield* mapAssistantStream(response.stream)
      },
    }),
    [],
  );

  const visionAdapter = useMemo(() => {
    return new VisionImageAdapter();
  }, []);

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => {
      return useLocalRuntime(adapter, {
        adapters: {
          attachments: visionAdapter,
        }
      });
    },
    adapter: {
      ...myDatabaseAdapter,

      // The Provider component adds thread-specific adapters
      unstable_Provider: ({ children }) => {
        // This runs in the context of each thread
        const aui = useAui();

        // Create thread-specific history adapter
        const history = useMemo<ThreadHistoryAdapter>(
          () => ({
            async load() {

              const { remoteId } = aui.threadListItem().getState();
              if (!remoteId) return { messages: [] };
              console.log("load history " + remoteId)
              const { data: chat } = await getWorkspaceChatWorkspaceV2WorkspaceIdChatsChatIdGet({
                path: {
                  chat_id: remoteId as string,
                  workspace_id: workspaceId as string
                }
              })

              return {
                messages: chat?.result?.messages.map((m) => {
                  const common = {
                    id: m.id,
                    createdAt: new Date(),
                  };
                  // `content` is stored as JSON — parse back into message parts
                  const content = JSON.parse(m.content || '');

                  if (m.role === "user") {
                    return {
                      parentId: m.parent_id,
                      message: {
                        ...common,
                        role: "user" as const,
                        content,
                        attachments: m.attachments || [],
                        metadata: { custom: {} },
                      },
                    };
                  }
                  if (m.role === "assistant") {
                    return {
                      parentId: m.parent_id,
                      message: {
                        ...common,
                        role: "assistant" as const,
                        content,
                        status: { type: "complete", reason: "stop" } as const,
                        metadata: {
                          custom: {},
                          unstable_state: null,
                          unstable_annotations: [],
                          unstable_data: [],
                          steps: [],
                        },
                      },
                    };
                  }
                  return {
                    parentId: m.parent_id,
                    message: {
                      ...common,
                      role: "system" as const,
                      content,
                      metadata: { custom: {} },
                    },
                  };
                }) ?? [],
              };
            },

            async append({ message, parentId }) {
              // Wait for initialization to get remoteId (safe to call multiple times)
              const { remoteId } = await aui.threadListItem().initialize();
              console.log("append message " + remoteId + " " + JSON.stringify(message))

              await appendWorkspaceChatMessageWorkspaceV2WorkspaceIdChatsChatIdMessagesPost({
                path: {
                  chat_id: remoteId as string,
                  workspace_id: workspaceId as string
                },
                body: {
                  content: JSON.stringify(message.content),
                  attachments: (message as any).attachments || [],
                  role: message.role,
                  parent_id: parentId,
                  id: message.id,
                  created_at: message.createdAt,
                }
              })

            },
          }),
          [aui],
        );

        const adapters = useMemo(() => ({ history }), [history]);

        return (
          <RuntimeAdapterProvider adapters={adapters}>
            {children}
          </RuntimeAdapterProvider>
        );
      },
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-full min-h-0 flex-col bg-background">
        <AssistantRuntimeProvider runtime={runtime}>
          <div className="min-h-0 flex flex-1 overflow-hidden">
            <div className="w-64 border-r border-gray-200 p-4">
              <ThreadList />
            </div>
            <div className="flex flex-1 overflow-hidden">
              <Thread className="w-full" />
            </div>
          </div>
        </AssistantRuntimeProvider>
      </div>
      );
}

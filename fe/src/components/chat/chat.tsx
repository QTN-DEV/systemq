import {
  AssistantRuntimeProvider,
  RuntimeAdapterProvider,
  useAui,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type AttachmentAdapter,
  type ChatModelAdapter,
  type CompleteAttachment,
  type PendingAttachment,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
} from "@assistant-ui/react";
import { useMemo, type ReactElement } from "react";

import { client } from "@/api/__generated__/client.gen";
import {
  appendMessageToChatThread,
  createChatThread,
  deleteChatThread,
  getChatThread,
  listChatThreads,
  streamChatThread,
  updateChatThread,
} from "@/api";
import { mapAssistantStream } from "@/utils/map-assistant-stream";

import { Thread } from "../assistant-ui/thread";
import { ThreadList } from "../assistant-ui/thread-list";

type ChatAssistantThreadProps = {
  workspaceId?: string | undefined;
};

export function ChatAssistantThread({
  workspaceId,
}: ChatAssistantThreadProps): ReactElement {
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
      // Skipping implementation for now
      throw new Error("Not implemented");
    }

    async remove(attachment: PendingAttachment): Promise<void> { }

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
      const response = await listChatThreads();
      console.log({
        chats: response.data?.result?.items?.map((t) => ({
          id: t.id,
          title: t.title,
        })) ?? []
      })
      return {
        threads: response.data?.result?.items?.map((t) => ({
          remoteId: t.id,
          status: 'regular',
          title: t.title,

        })) ?? []
      }
    },

    async initialize(threadId) {
      const response = await createChatThread({
        body: {
          title: "New Chat",
          messages: [],
        },
      });

      const remoteThreadId = response.data?.result?.id || threadId;

      return {
        externalId: remoteThreadId,
        remoteId: remoteThreadId
      };
    },

    async rename(remoteId, newTitle) {
      console.log(`thread rename ${remoteId} ${newTitle}`);
      await updateChatThread({
        path: { thread_id: remoteId },
        body: { title: newTitle },
      });
    },

    async archive(remoteId) {
      console.log(`thread archive ${remoteId}`);
    },

    async unarchive(remoteId) {
      console.log(`thread unarchive ${remoteId}`);
    },

    async delete(remoteId) {
      console.log(`thread delete ${remoteId}`);
      await deleteChatThread({
        path: { thread_id: remoteId },
      });
    },

    async generateTitle(remoteId, unstable_messages) { },
  };

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, unstable_threadId, context }) {
        const response = await streamChatThread({
          path: {
            thread_id: unstable_threadId as string,
          },
          body: {
            messages: messages.map((m) => ({
              role: m.role as "user" | "assistant" | "system",
              attachments: (m.attachments as any[]) || [],
              content: m.content
                .map((c) => (c.type === "text" ? c.text : ""))
                .join(""),
            })),
          },
        });
        yield* mapAssistantStream(response.stream);
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
        },
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
              console.log(`load history ${remoteId}`);
              const { data: chat } = await getChatThread({
                path: {
                  thread_id: remoteId,
                },
              });

              return {
                messages:
                  chat?.result?.messages.map((m) => {
                    const common = {
                      id: m.id || crypto.randomUUID(),
                      createdAt: new Date(),
                    };
                    // `content` is stored as JSON — parse back into message parts
                    let content;
                    try {
                      content = JSON.parse(m.content || "");
                    } catch (e) {
                      content = [{ type: "text", text: m.content }];
                    }

                    if (m.role === "user") {
                      return {
                        parentId: m.parent_id || undefined,
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
                        parentId: m.parent_id || undefined,
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
                      parentId: m.parent_id || undefined,
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
              console.log(
                `append message ${remoteId} ${JSON.stringify(message)}`
              );

              await appendMessageToChatThread({
                path: {
                  thread_id: remoteId,
                },
                body: {
                  content: JSON.stringify(message.content),
                  attachments: (message as any).attachments || [],
                  role: message.role as "user" | "assistant" | "system",
                  parent_id: parentId,
                  id: message.id,
                  created_at: message.createdAt,
                },
              });
            },
          }),
          [aui]
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
    </div>
  );
}

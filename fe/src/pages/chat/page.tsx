import { type ReactElement } from "react";

import { WorkspaceAssistantThread } from "@/components/chat/workspace-assistant-thread";
import { useChatAdapter } from "@/hooks/use-chat-adapter";

export default function ChatPage(): ReactElement {
  const runtime = useChatAdapter();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b bg-background px-4 py-2.5">
        <h1 className="text-base font-semibold">Chat</h1>
      </div>
      <div className="min-h-0 flex-1">
        <WorkspaceAssistantThread runtime={runtime} />
      </div>
    </div>
  );
}

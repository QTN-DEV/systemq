import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { type ReactElement } from "react";

import { Thread } from "../assistant-ui/thread";
import { ThreadList } from "../assistant-ui/thread-list";

type WorkspaceAssistantThreadProps = {
  runtime: React.ComponentProps<typeof AssistantRuntimeProvider>["runtime"];
  workspaceId?: string | undefined;
};

export function WorkspaceAssistantThread({
  runtime,
  workspaceId: _workspaceId,
}: WorkspaceAssistantThreadProps): ReactElement {
  // Omitted getWorkspacesFileRecommendationsOptions since we don't have it yet

  return (
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

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { type ReactElement } from "react";

import { Thread } from "../assistant-ui/thread";

type WorkspaceAssistantThreadProps = {
  runtime: React.ComponentProps<typeof AssistantRuntimeProvider>["runtime"]
  workspaceId?: string | undefined
}

export function WorkspaceAssistantThread({
  runtime,
  workspaceId: _workspaceId,
}: WorkspaceAssistantThreadProps): ReactElement {
  // Omitted getWorkspacesFileRecommendationsOptions since we don't have it yet

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Thread />
        </div>
      </AssistantRuntimeProvider>
    </div>
  )
}

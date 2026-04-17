import { AssistantRuntimeProvider } from "@assistant-ui/react"
import { Thread } from "../assistant-ui/thread"
import { type ReactElement } from "react"

type WorkspaceAssistantThreadProps = {
  runtime: React.ComponentProps<typeof AssistantRuntimeProvider>["runtime"]
  workspaceId?: string | undefined
}

export function WorkspaceAssistantThread({
  runtime,
  workspaceId,
}: WorkspaceAssistantThreadProps): ReactElement {
  // Omitted getWorkspacesFileRecommendationsOptions since we don't have it yet
  
  return (
    <div className="flex h-full flex-col bg-red-200">
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Thread />
        </div>
      </AssistantRuntimeProvider>
    </div>
  )
}

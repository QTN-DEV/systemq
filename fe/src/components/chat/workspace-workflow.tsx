import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { useMemo, useEffect, useRef, type ReactElement } from "react";

import { workspaceExecuteWorkflow } from '@/api';
import { mapAssistantStream } from "@/utils/map-assistant-stream";

import { Thread } from "../assistant-ui/thread";

type WorkspaceWorkflowRunProps = {
  workspaceId: string;
  workflowName: string;
  inputs: Record<string, string>;
};

export function WorkspaceWorkflowRun({
  workspaceId,
  workflowName,
  inputs,
}: WorkspaceWorkflowRunProps): ReactElement {

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run() {
        const response = await workspaceExecuteWorkflow({
          path: {
            name: workflowName,
            workspace_id: workspaceId
          },
          body: {
            inputs: inputs,
          },
        });
        yield* mapAssistantStream(response.stream);
      },
    }),
    [workspaceId, workflowName, inputs],
  );

  const runtime = useLocalRuntime(adapter);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      // Start the execution immediately by appending a dummy user message
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: `Execute workflow: ${workflowName}` }],
      });
      started.current = true;
    }
  }, [runtime, workflowName]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex flex-1 overflow-hidden">
          <Thread className="w-full" onLoadMore={() => console.log("Load more")} />
        </div>
      </AssistantRuntimeProvider>
    </div>
  )
}
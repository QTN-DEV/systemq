import { useRemoteThreadListRuntime } from "@assistant-ui/react";
import { type ReactElement } from "react";
import { useParams } from "react-router-dom";

import { WorkspaceAssistantThread } from "@/components/chat/workspace-assistant-thread";
import { useWorkspaceChatAdapter } from "@/hooks/use-workspace-chat";
import { useWorkspaceThreadAdapter } from "@/hooks/use-workspace-thread-adapter";
import { cn } from "@/lib/utils";

export type WorkspaceV2ChatTabProps = {
  className?: string;
};

export function WorkspaceV2ChatTab(
  props: WorkspaceV2ChatTabProps,
): ReactElement {
  const { className } = props;
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const id = workspaceId?.trim() ?? "";

  const threadAdapter = useWorkspaceThreadAdapter({ workspaceId: id });

  const runtime = useRemoteThreadListRuntime({
    adapter: threadAdapter,
    runtimeHook: useWorkspaceChatAdapter,
  });

  if (!id) {
    return (
      <div className={cn("p-4 md:p-6", className)}>
        <p className="text-muted-foreground text-sm">Missing workspace.</p>
      </div>
    );
  }
  return <WorkspaceAssistantThread runtime={runtime} workspaceId={id} />;
}

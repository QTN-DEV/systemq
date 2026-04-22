import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { type ComponentProps, type ReactElement } from "react";

import { Thread } from "@/components/assistant-ui/thread";
import { cn } from "@/lib/utils";

import { useDashboardChatAdapter } from "./hooks/use-dashboard-chat-adapter";
import { useStore } from "./hooks/use-store";

export type DynamicDashboardChatProps = ComponentProps<"div">;

export function DynamicDashboardChat({
  ...props
}: DynamicDashboardChatProps): ReactElement {
  const isChatOpen = useStore((state) => state.isChatOpen);
  const runtime = useDashboardChatAdapter();

  return (
    <div
      {...props}
      className={cn(
        "h-full w-full overflow-hidden border-l border-gray-200 transition-transform duration-300",
        props.className,
        !isChatOpen && "hidden",
      )}
    >
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="min-h-0 h-full">
          <Thread />
        </div>
      </AssistantRuntimeProvider>
    </div>
  );
}

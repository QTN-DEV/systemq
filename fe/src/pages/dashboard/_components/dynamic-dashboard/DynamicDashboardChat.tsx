import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  useLocalRuntime,
} from "@assistant-ui/react";
import { useMemo, type ComponentProps, type ReactElement } from "react";

import { Thread } from "@/components/assistant-ui/thread";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { mapAssistantStream, parseSSE } from "@/utils/map-assistant-stream";

import { useStore, useStoreApi } from "./hooks/use-store";

export type DynamicDashboardChatProps = ComponentProps<"div">;

export function DynamicDashboardChat({
  ...props
}: DynamicDashboardChatProps): ReactElement {
  const store = useStoreApi();
  const userId = useStore((state) => state.userId);

  const isChatOpen = useStore((state) => state.isChatOpen);

  return (
    <div
      id="dynamic-dashboard-chat"
      {...props}
      className={cn(
        "h-full w-full overflow-hidden border-l border-gray-200 transition-transform duration-300",
        props.className,
        !isChatOpen && "translate-x-full hidden",
      )}
    >
      {/* <AssistantRuntimeProvider runtime={runtime}>
        <div className="min-h-0 h-full">
          <Thread />
        </div>
      </AssistantRuntimeProvider> */}
    </div>
  );
}

// function buildHeaders(): HeadersInit {
//   const session = useAuthStore.getState().getCurrentSession();

//   return {
//     "Content-Type": "application/json",
//     ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
//   };
// }

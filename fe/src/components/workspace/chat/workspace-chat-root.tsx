import { useState } from "react";

import { createStore } from "./stores/create-store";
import type { DynamicWorkspaceChatState, PartialExcept } from "./types";
import { WorkspaceChatContext } from "./workspace-chat-context";

export type WorkspaceChatRootProps = {
  children: React.ReactNode;
} & PartialExcept<DynamicWorkspaceChatState, "workspaceId">;

export function WorkspaceChatRoot({
  children,
  ...props
}: WorkspaceChatRootProps): React.ReactElement {
  const [store] = useState<ReturnType<typeof createStore>>(createStore(props));

  return (
    <WorkspaceChatContext.Provider value={store}>
      {children}
    </WorkspaceChatContext.Provider>
  );
}

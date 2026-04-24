import type { DynamicWorkspaceChatState, PartialExcept } from "../types";

export const getInitialState = (
  args: PartialExcept<DynamicWorkspaceChatState, "workspaceId">,
): DynamicWorkspaceChatState => {
  return {
    workspaceId: args?.workspaceId ?? "",
    messages: args?.messages ?? [],
  };
};

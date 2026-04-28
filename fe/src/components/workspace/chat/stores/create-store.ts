import { createStore as createVanillaStore } from "zustand/vanilla";

import type { DynamicWorkspaceChatState, PartialExcept } from "../types";

import { getInitialState } from "./initital-state";

export function createStore(
  args: PartialExcept<DynamicWorkspaceChatState, "workspaceId">,
) {
  return createVanillaStore<DynamicWorkspaceChatState>((_set, _get) => {
    return {
      ...getInitialState({ ...(args ?? {}), workspaceId: args.workspaceId }),
    };
  });
}

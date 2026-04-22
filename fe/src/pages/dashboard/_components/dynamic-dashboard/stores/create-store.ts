import { createStore as createVanillaStore } from "zustand/vanilla";

import type { DynamicDashboardState, PartialExcept } from "../types";

import { getInitialState } from "./initital-state";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function createStore(
  args: PartialExcept<DynamicDashboardState, "userId">,
) {
  return createVanillaStore<DynamicDashboardState>((_set, _get) => {
    return { ...getInitialState({ ...(args ?? {}), userId: args.userId }) };
  });
}

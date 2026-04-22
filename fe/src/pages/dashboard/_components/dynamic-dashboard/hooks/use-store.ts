import { useContext, useMemo } from "react";
import { useStoreWithEqualityFn as useZustandStore } from "zustand/traditional";

import { DynamicDashboardContext } from "../context";
import type { DynamicDashboardState } from "../types";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useStore<StateSlice = unknown>(
  selector: (state: DynamicDashboardState) => StateSlice,
  equalityFn?: (a: StateSlice, b: StateSlice) => boolean,
) {
  const store = useContext(DynamicDashboardContext);

  if (store === null) {
    throw new Error("DynamicDashboardStore not found");
  }

  return useZustandStore(store, selector, equalityFn);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useStoreApi() {
  const store = useContext(DynamicDashboardContext);

  if (store === null) {
    throw new Error("DynamicDashboardStore not found");
  }

  return useMemo(
    () => ({
      getState: store.getState,
      setState: store.setState,
      subscribe: store.subscribe,
    }),
    [store],
  );
}

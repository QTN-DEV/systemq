import { useState } from "react";

import { DynamicDashboardContext } from "./context";
import { DynamicDashboardLoader } from "./DynamicDashboardLoader";
import { createStore } from "./stores/create-store";
import type { DynamicDashboardState, PartialExcept } from "./types";

export type DynamicDashboardRootProps = {
  children: React.ReactNode;
} & PartialExcept<DynamicDashboardState, "userId">;

export function DynamicDashboardRoot({
  children,
  ...props
}: DynamicDashboardRootProps): React.ReactElement {
  const [store] = useState<ReturnType<typeof createStore>>(createStore(props));

  return (
    <DynamicDashboardContext.Provider value={store}>
      <DynamicDashboardLoader />
      {children}
    </DynamicDashboardContext.Provider>
  );
}

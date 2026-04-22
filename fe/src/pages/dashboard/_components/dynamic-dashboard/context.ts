import { createContext } from "react";

import type { createStore } from "./stores/create-store";

export const DynamicDashboardContext = createContext<ReturnType<
  typeof createStore
> | null>(null);

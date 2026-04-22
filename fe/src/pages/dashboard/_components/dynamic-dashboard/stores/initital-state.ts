import type { DynamicDashboardState, PartialExcept } from "../types";

export const getInitialState = (
  args: PartialExcept<DynamicDashboardState, "userId">,
): DynamicDashboardState => {
  return {
    content: args?.content ?? "",
    version: args?.version ?? 0,
    userId: args.userId,
    isLoading: false,
    isChatOpen: false,
  };
};

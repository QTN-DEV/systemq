export type DynamicDashboardState = {
  content: string;
  version: number;
  userId: string;
  isLoading: boolean;
  isChatOpen: boolean;
};

export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> &
  Pick<T, K>;

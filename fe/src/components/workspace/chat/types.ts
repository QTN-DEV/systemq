export type DynamicWorkspaceChatState = {
  workspaceId: string;
  messages: [];
};

export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> &
  Pick<T, K>;

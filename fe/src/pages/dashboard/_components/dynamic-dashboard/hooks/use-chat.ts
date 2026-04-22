import { useCallback } from "react";

import { useStoreApi } from "./use-store";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useChat() {
  const store = useStoreApi();
  const toggleChat = useCallback(() => {
    store.setState((state) => ({
      ...state,
      isChatOpen: !state.isChatOpen,
    }));
  }, [store]);

  return {
    toggleChat,
  };
}

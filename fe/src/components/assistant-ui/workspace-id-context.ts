import { createContext, useContext } from "react";

export const WorkspaceIdContext = createContext<string | undefined>(undefined);
export const useWorkspaceId = () => useContext(WorkspaceIdContext);

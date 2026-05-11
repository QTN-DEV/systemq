import { createContext } from "react";

import type { AuthContextUser } from "./types";

export type AuthContext = {
  user: AuthContextUser | null;
  logout: () => void;
  isValidating: boolean;
  isLoggingIn: boolean;
  login: (credentials: { email: string; password: string }) => void;
};

export const AuthContext = createContext<AuthContext>({
  user: null,
  logout: () => {},
  isValidating: false,
  isLoggingIn: false,
  login: () => {},
});

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getMyProfile, getMyProfileOptions, loginMutation } from "@/api";
import { useLocalStorage } from "@/hooks/use-local-storage";

import { AuthContext } from "../context";
import type { AuthContextUser } from "../types";

export type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider(props: AuthProviderProps) {
  const { children } = props;

  const [user, setUser] = useState<AuthContextUser | null>(null);

  const hasAttemptedFetchProfile = useRef(false);

  const [session, setSession] = useLocalStorage<string | null>(
    "auth_token",
    null,
  );

  const { isLoading: isFetchingProfile } = useQuery({
    ...getMyProfileOptions(),
    enabled: Boolean(session),
  });

  const { mutateAsync: login, isPending: isLoggingIn } = useMutation({
    ...loginMutation(),
    onSuccess: (data) => {
      setSession(data.token ?? null);
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
      });
    },
  });

  useEffect(() => {
    const token = session;
    console.log({ token });

    if (token && !hasAttemptedFetchProfile.current) {
      hasAttemptedFetchProfile.current = true;

      getMyProfile().then(({ data }) => {
        if (data?.result) {
          setUser({
            id: data.result.id,
            name: data.result.name,
            email: data.result.email,
          });
        }
      });
    }
  }, [session]);

  const handleLogin = useCallback(
    (credentials: { email: string; password: string }) => {
      login({
        body: {
          email: credentials.email,
          password: credentials.password,
        },
      });
    },
    [login],
  );

  const contextValue = useMemo(
    () => ({
      user,
      logout: () => {},
      isValidating: isFetchingProfile,
      isLoggingIn,
      login: handleLogin,
    }),
    [user, isFetchingProfile, isLoggingIn, handleLogin],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

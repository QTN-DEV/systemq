import { config } from "@/lib/config";

import { client } from "./__generated__/client.gen";

const AUTH_SESSION_STORAGE_KEY = "auth.session";

type PersistedSession = {
  state?: { session?: { token?: string; expiresAt?: number } | null };
};

function readTokenFromAuthSessionKey(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as PersistedSession;
    const session = parsed.state?.session;
    if (!session?.token) {
      return undefined;
    }
    if (typeof session.expiresAt === "number" && Date.now() > session.expiresAt) {
      return undefined;
    }
    return session.token;
  } catch {
    return undefined;
  }
}

client.setConfig({
  baseUrl: config.apiBaseUrl,
  auth: () => readTokenFromAuthSessionKey(),
});

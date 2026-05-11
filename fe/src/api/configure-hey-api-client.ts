import { config } from "@/lib/config";

import { client } from "./__generated__/client.gen";

const AUTH_SESSION_STORAGE_KEY = "auth.session";

function readTokenFromAuthSessionKey(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    const raw =
      JSON.parse(localStorage.getItem("auth_token") ?? "") ??
      localStorage.getItem(AUTH_SESSION_STORAGE_KEY);

    if (!raw) {
      return undefined;
    }
    return raw;
  } catch {
    return undefined;
  }
}

client.setConfig({
  baseUrl: config.apiBaseUrl,
  auth: () => {
    const token = readTokenFromAuthSessionKey();
    return token;
  },
});

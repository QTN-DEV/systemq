import { z } from 'zod';

const DEFAULT_API_BASE_URL = 'https://api.systemq.qtn.ai';

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_BASE_URL: z.string().url().default(DEFAULT_API_BASE_URL),
});

const processEnv =
  typeof process !== 'undefined' && process.env
    ? process.env
    : ({} as Record<string, string | undefined>);

const parsedServerEnv = serverEnvSchema.parse({
  NODE_ENV: processEnv.NODE_ENV,
  API_BASE_URL:
    processEnv.API_BASE_URL ??
    processEnv.VITE_API_BASE_URL ??
    DEFAULT_API_BASE_URL,
});

export const serverConfig = {
  nodeEnv: parsedServerEnv.NODE_ENV,
  apiBaseUrl: parsedServerEnv.API_BASE_URL,
} as const;

const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default(serverConfig.apiBaseUrl),
});

const importMetaEnv: Record<string, string | undefined> = (() => {
  try {
    return (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  } catch {
    return {};
  }
})();

const parsedClientEnv = clientEnvSchema.parse({
  VITE_API_BASE_URL:
    importMetaEnv.VITE_API_BASE_URL ??
    processEnv.VITE_API_BASE_URL ??
    processEnv.API_BASE_URL ??
    serverConfig.apiBaseUrl,
});

export const clientConfig = {
  apiBaseUrl: parsedClientEnv.VITE_API_BASE_URL,
} as const;

export type ServerConfig = typeof serverConfig;
export type ClientConfig = typeof clientConfig;

export const config = {
  server: serverConfig,
  client: clientConfig,
} as const;

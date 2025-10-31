import { z } from 'zod';

// Default to localhost for development
// In production, this should be set via VITE_API_BASE_URL environment variable
const DEFAULT_API_BASE_URL = 'http://localhost:47430';

const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().optional(),
});

const importMetaEnv: Record<string, string | undefined> = (() => {
  try {
    return (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  } catch {
    return {};
  }
})();

const parsedClientEnv = clientEnvSchema.parse({
  VITE_API_BASE_URL: importMetaEnv.VITE_API_BASE_URL,
});

export const config = {
  apiBaseUrl: parsedClientEnv.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
} as const;

export type Config = typeof config;

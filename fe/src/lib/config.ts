import { z } from 'zod';

// Default to localhost for development
// In production, this should be set via VITE_API_BASE_URL environment variable
const DEFAULT_API_BASE_URL = 'http://localhost:47430';

const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().optional(),
  DEV: z.boolean().optional(),
  MODE: z.enum(['development', 'production', 'test']).optional(),
});

const importMetaEnv: Record<string, string | boolean | undefined> = (() => {
  try {
    return (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
  } catch {
    return {};
  }
})();

const parsedClientEnv = clientEnvSchema.parse({
  VITE_API_BASE_URL: importMetaEnv.VITE_API_BASE_URL as string | undefined,
  DEV: importMetaEnv.DEV as boolean | undefined,
  MODE: importMetaEnv.MODE as string | undefined,
});

export const config = {
  apiBaseUrl: parsedClientEnv.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  isDev: parsedClientEnv.DEV ?? (parsedClientEnv.MODE === 'development'),
  mode: parsedClientEnv.MODE ?? 'development',
} as const;

export type Config = typeof config;

// Default to localhost for development
// In production, this should be set via VITE_API_BASE_URL environment variable
const DEFAULT_API_BASE_URL = 'http://localhost:47430';

const env = import.meta.env;

// Parse comma-separated values into array
export const parseList = (value: string | undefined): string[] => {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

export const config = {
  apiBaseUrl: (env.VITE_API_BASE_URL as string) || DEFAULT_API_BASE_URL,
  isDev: (env.DEV as boolean) ?? (env.MODE === 'development'),
  mode: (env.MODE as string) || 'development',
  // Example of parsing lists from env vars if needed:
  // allowedOrigins: parseList(env.VITE_ALLOWED_ORIGINS as string),
} as const;

export type Config = typeof config;

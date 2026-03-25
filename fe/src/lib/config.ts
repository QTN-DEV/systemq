// Default to localhost for development
// In production, this should be set via VITE_API_BASE_URL environment variable
const DEFAULT_API_BASE_URL = 'http://localhost:47430';

const env = import.meta.env;
const runtimeEnv =
  typeof window !== "undefined" ? (window as Window & { env?: Record<string, string> }).env : undefined;

const normalizeApiBaseUrl = (value: string | undefined): string => {
  const rawValue = value?.trim();
  if (!rawValue) return DEFAULT_API_BASE_URL;

  try {
    const url = new URL(rawValue);
    const isLocalHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "0.0.0.0";

    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      url.protocol === "http:" &&
      !isLocalHost
    ) {
      url.protocol = "https:";
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return rawValue.replace(/\/$/, "");
  }
};

// Parse comma-separated values into array
export const parseList = (value: string | undefined): string[] => {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

export const config = {
  apiBaseUrl: normalizeApiBaseUrl(runtimeEnv?.VITE_API_BASE_URL || (env.VITE_API_BASE_URL as string)),
  bucketDomain: (env.VITE_BUCKET_DOMAIN as string) || 'bucket.quantumteknologi.com',
  bucketUseSSL: env.VITE_BUCKET_USE_SSL === undefined ? true : (env.VITE_BUCKET_USE_SSL as string) === 'true',
  isDev: (env.DEV) ?? (env.MODE === 'development'),
  mode: (env.MODE) || 'development',
  // Example of parsing lists from env vars if needed:
  // allowedOrigins: parseList(env.VITE_ALLOWED_ORIGINS as string),
} as const;

export type Config = typeof config;

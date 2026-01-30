import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

const getPlatformOS = (): string => {
  try {
    const { Platform } = require('react-native');
    return Platform?.OS || 'unknown';
  } catch {
    return 'unknown';
  }
};

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = (): string => {
  try {
    const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
    if (url && typeof url === 'string' && url.length > 0) {
      return url.replace(/\/$/, '');
    }
    
    const platformOS = getPlatformOS();
    if (platformOS === 'web' && typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    
    return 'https://api.rork.app';
  } catch {
    return 'https://api.rork.app';
  }
};

const fetchWithTimeout = async (
  url: string | URL | Request, 
  options?: RequestInit,
  timeout = 30000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try { controller.abort(); } catch {}
  }, timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

let trpcClientInstance: ReturnType<typeof trpc.createClient> | null = null;

const createTrpcClient = (): ReturnType<typeof trpc.createClient> => {
  const baseUrl = getBaseUrl();
  const platformOS = getPlatformOS();
  
  return trpc.createClient({
    links: [
      httpLink({
        url: baseUrl + '/api/trpc',
        transformer: superjson,
        fetch: fetchWithTimeout,
        headers() {
          return {
            'Content-Type': 'application/json',
            'X-Platform': platformOS,
          };
        },
      }),
    ],
  });
};

export const getTrpcClient = (): ReturnType<typeof trpc.createClient> => {
  if (!trpcClientInstance) {
    trpcClientInstance = createTrpcClient();
  }
  return trpcClientInstance;
};

export const resetTrpcClient = () => {
  trpcClientInstance = null;
};

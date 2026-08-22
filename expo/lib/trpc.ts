import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";
import { getStoredAccessToken } from "@/lib/authStorage";

const getPlatformOS = (): string => {
  try {
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
        headers: async () => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Platform': platformOS,
          };
          // Attach the signed-in user's token so translation can be logged
          // to their account (portal policy: sign-in required to translate).
          try {
            const token = await getStoredAccessToken();
            if (token) headers.Authorization = `Bearer ${token}`;
          } catch {
            // no stored token — request proceeds unauthenticated
          }
          return headers;
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

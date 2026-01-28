import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";

let platformOS = 'unknown';
try {
  platformOS = Platform?.OS || 'unknown';
} catch {
  platformOS = 'unknown';
}

let trpcInstance: ReturnType<typeof createTRPCReact<AppRouter>> | null = null;

const createTrpcInstance = (): ReturnType<typeof createTRPCReact<AppRouter>> => {
  if (!trpcInstance) {
    try {
      trpcInstance = createTRPCReact<AppRouter>();
    } catch (error) {
      console.warn('Failed to create tRPC instance:', error);
      trpcInstance = createTRPCReact<AppRouter>();
    }
  }
  return trpcInstance;
};

export const trpc = createTrpcInstance();

const AUTH_TOKEN_KEY = '@zomi_auth_token';
const AUTH_USER_KEY = '@zomi_auth_user';

interface AuthUserData {
  userId: string;
  role: string;
}

let cachedAuthData: AuthUserData | null = null;
let authDataPromise: Promise<AuthUserData | null> | null = null;
let lastAuthFetch = 0;
const AUTH_CACHE_TTL = 30000;

const safeBase64Encode = (str: string): string => {
  try {
    if (typeof btoa === 'function') {
      return btoa(str);
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let result = '';
    let i = 0;
    while (i < str.length) {
      const a = str.charCodeAt(i++) || 0;
      const b = i < str.length ? (str.charCodeAt(i++) || 0) : 0;
      const c = i < str.length ? (str.charCodeAt(i++) || 0) : 0;
      const b1 = a >> 2;
      const b2 = ((a & 3) << 4) | (b >> 4);
      const b3 = ((b & 15) << 2) | (c >> 6);
      const b4 = c & 63;
      result += chars[b1] + chars[b2] + (i - 1 < str.length ? chars[b3] : '=') + (i < str.length ? chars[b4] : '=');
    }
    return result;
  } catch {
    return '';
  }
};

const getAuthData = async (): Promise<AuthUserData | null> => {
  const now = Date.now();
  if (cachedAuthData && now - lastAuthFetch < AUTH_CACHE_TTL) {
    return cachedAuthData;
  }
  
  if (authDataPromise) {
    return authDataPromise;
  }
  
  authDataPromise = (async () => {
    try {
      let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default | null = null;
      try {
        const module = await import('@react-native-async-storage/async-storage');
        AsyncStorage = module.default;
      } catch {
        return null;
      }
      
      if (!AsyncStorage) return null;
      
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 2000);
      });
      
      const fetchPromise = (async () => {
        try {
          const [token, userJson] = await Promise.all([
            AsyncStorage!.getItem(AUTH_TOKEN_KEY),
            AsyncStorage!.getItem(AUTH_USER_KEY),
          ]);
          
          if (token && userJson) {
            try {
              const user = JSON.parse(userJson);
              const data = {
                userId: user?.userId || token,
                role: user?.role || 'user',
              };
              cachedAuthData = data;
              lastAuthFetch = Date.now();
              return data;
            } catch {
              return null;
            }
          }
          return null;
        } catch {
          return null;
        }
      })();
      
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch {
      return null;
    } finally {
      authDataPromise = null;
    }
  })();
  
  return authDataPromise;
};

const getBaseUrl = (): string => {
  try {
    const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
    if (url && typeof url === 'string' && url.length > 0) {
      return url.replace(/\/$/, '');
    }
    
    if (platformOS === 'web') {
      if (typeof window !== 'undefined' && window.location) {
         return window.location.origin;
      }
      return ''; 
    }
    
    return 'https://api.rork.app';
  } catch {
    return 'https://api.rork.app';
  }
};

let trpcClientInstance: ReturnType<typeof trpc.createClient> | null = null;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (
  url: string | URL | Request, 
  options?: RequestInit,
  retries = 2,
  timeout = 30000
): Promise<Response> => {
  let lastError: Error | null = null;
  
  let urlString = '';
  try {
    urlString = url instanceof Request ? url.url : url.toString();
  } catch {
    urlString = '';
  }
  
  const isMutation = urlString.includes('mutation') || 
                     (options?.method === 'POST' && options?.body);

  const isDictionary = urlString.includes('dictionary');
  const isCreatePost = urlString.includes('createPost') || urlString.includes('adminCreatePost');
  const isTranslation = urlString.includes('translation');
  
  const effectiveTimeout = isDictionary ? 45000 : (isTranslation ? 30000 : (isMutation ? 25000 : timeout));
  const effectiveRetries = isDictionary ? 2 : (isCreatePost ? 2 : (isMutation ? 2 : retries));
  
  for (let attempt = 0; attempt < effectiveRetries; attempt++) {
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => {
      try {
        controller.abort();
      } catch {
        // Ignore abort errors
      }
    }, effectiveTimeout);
    
    try {
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
      };
      
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error('Server error: ' + response.status);
        }
        if (response.status === 0) {
          throw new Error('Network error - connection blocked or CORS issue');
        }
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const errorName = lastError?.name || '';
      const errorMessage = lastError?.message || '';
      const isAbortError = errorName === 'AbortError';
      const isNetworkError = errorMessage === 'Failed to fetch' || 
                              errorMessage.includes('Network request failed') ||
                              errorMessage.includes('network') ||
                              errorMessage.includes('NetworkError') ||
                              errorMessage.includes('CORS') ||
                              errorMessage.includes('ERR_CONNECTION') ||
                              errorMessage.includes('ECONNREFUSED') ||
                              errorName === 'TypeError';
      
      if (isAbortError) {
        lastError = new Error('Request timeout - the server took too long to respond');
      }
      
      if (attempt < effectiveRetries - 1) {
        const jitter = Math.random() * 300;
        const baseDelay = isNetworkError ? 500 : 300;
        const backoffDelay = Math.min(baseDelay * Math.pow(1.5, attempt) + jitter, 5000);
        await delay(backoffDelay);
      }
    }
  }
  
  if (lastError) {
    const errorMessage = lastError?.message || '';
    const errorName = lastError?.name || '';
    if (errorMessage === 'Failed to fetch' || 
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('network') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('CORS') ||
        errorMessage.includes('ERR_CONNECTION') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorName === 'TypeError') {
      throw new Error('Unable to connect to server. Please check your internet connection and try again.');
    }
    throw lastError;
  }
  
  throw new Error('Request failed after multiple attempts');
};

const createTrpcClient = (): ReturnType<typeof trpc.createClient> => {
  try {
    const baseUrl = getBaseUrl();
    
    return trpc.createClient({
      links: [
        httpLink({
          url: baseUrl + '/api/trpc',
          transformer: superjson,
          fetch: fetchWithRetry,
          async headers() {
            try {
              const authData = await getAuthData();
              if (authData) {
                let authPayload = '';
                try {
                  const jsonStr = JSON.stringify(authData);
                  authPayload = safeBase64Encode(jsonStr);
                } catch {
                  authPayload = '';
                }
                if (authPayload) {
                  return {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authPayload,
                    'X-Platform': platformOS,
                  };
                }
              }
            } catch {
              // Ignore header errors
            }
            return {
              'Content-Type': 'application/json',
              'X-Platform': platformOS,
            };
          },
        }),
      ],
    });
  } catch (error) {
    console.warn('Error creating tRPC client:', error);
    return trpc.createClient({
      links: [
        httpLink({
          url: 'https://api.rork.app/api/trpc',
          transformer: superjson,
        }),
      ],
    });
  }
};

let clientInitialized = false;

export const getTrpcClient = (): ReturnType<typeof trpc.createClient> => {
  if (!trpcClientInstance || !clientInitialized) {
    try {
      trpcClientInstance = createTrpcClient();
      clientInitialized = true;
    } catch (error) {
      console.warn('Failed to create tRPC client:', error);
      try {
        trpcClientInstance = trpc.createClient({
          links: [
            httpLink({
              url: 'https://api.rork.app/api/trpc',
              transformer: superjson,
            }),
          ],
        });
        clientInitialized = true;
      } catch {
        throw new Error('Failed to initialize tRPC client');
      }
    }
  }
  
  return trpcClientInstance;
};

export const resetTrpcClient = () => {
  trpcClientInstance = null;
  clientInitialized = false;
};

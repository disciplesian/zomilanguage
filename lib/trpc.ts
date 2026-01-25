import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";

let trpcInstance: ReturnType<typeof createTRPCReact<AppRouter>> | null = null;
let trpcCreationAttempts = 0;
const MAX_CREATION_ATTEMPTS = 3;

const getTrpcInstance = (): ReturnType<typeof createTRPCReact<AppRouter>> => {
  if (!trpcInstance) {
    trpcCreationAttempts++;
    try {
      trpcInstance = createTRPCReact<AppRouter>();
      console.log('tRPC instance created successfully');
    } catch (error) {
      console.error('Failed to create tRPC instance:', error);
      if (trpcCreationAttempts < MAX_CREATION_ATTEMPTS) {
        console.log('Retrying tRPC instance creation...');
        try {
          trpcInstance = createTRPCReact<AppRouter>();
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          throw new Error('Failed to create tRPC instance after retry');
        }
      } else {
        throw new Error('Failed to create tRPC instance after multiple attempts');
      }
    }
  }
  return trpcInstance!;
};

const trpcProxy = new Proxy({} as ReturnType<typeof createTRPCReact<AppRouter>>, {
  get(target, prop) {
    const instance = getTrpcInstance();
    return (instance as any)[prop];
  },
});

export const trpc = trpcProxy;

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
        console.warn('trpc: AsyncStorage not available');
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
    
    // Fallback for Web: Use relative path if no env var, assuming proxy or same-origin
    if (Platform.OS === 'web') {
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
  
  const urlString = url instanceof Request ? url.url : url.toString();
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
      controller.abort();
    }, effectiveTimeout);
    
    try {
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
      };
      
      // Only add keepalive if explicitly supported and not on web (where it can cause issues with some proxies)
      // and mostly relevant for background/page-unload requests which isn't the primary case here.
      // Removed keepalive to prevent potential "Network request failed" on some Android/Web configs.
      
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
        if (response.status === 0) {
          throw new Error('Network error - connection blocked or CORS issue');
        }
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const isAbortError = lastError.name === 'AbortError';
      const isNetworkError = lastError.message === 'Failed to fetch' || 
                              lastError.message.includes('Network request failed') ||
                              lastError.message.includes('network') ||
                              lastError.message.includes('NetworkError') ||
                              lastError.message.includes('CORS') ||
                              lastError.message.includes('ERR_CONNECTION') ||
                              lastError.message.includes('ECONNREFUSED') ||
                              lastError.name === 'TypeError';
      
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
    if (lastError.message === 'Failed to fetch' || 
        lastError.message.includes('Network request failed') ||
        lastError.message.includes('network') ||
        lastError.message.includes('NetworkError') ||
        lastError.message.includes('CORS') ||
        lastError.message.includes('ERR_CONNECTION') ||
        lastError.message.includes('ECONNREFUSED') ||
        lastError.name === 'TypeError') {
      throw new Error('Unable to connect to server. Please check your internet connection and try again.');
    }
    throw lastError;
  }
  
  throw new Error('Request failed after multiple attempts');
};

const createTrpcClient = (): ReturnType<typeof trpc.createClient> => {
  try {
    const baseUrl = getBaseUrl();
    console.log('Creating tRPC client with base URL:', baseUrl);
    
    const currentTrpc = getTrpcInstance();
    return currentTrpc.createClient({
      links: [
        httpLink({
          url: `${baseUrl}/api/trpc`,
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
                } catch (encodeError) {
                  console.warn('Error encoding auth payload:', encodeError);
                  authPayload = '';
                }
                if (authPayload) {
                  return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authPayload}`,
                    'X-Platform': Platform.OS,
                  };
                }
              }
            } catch (headerError) {
              console.warn('Error building headers:', headerError);
            }
            return {
              'Content-Type': 'application/json',
              'X-Platform': Platform.OS,
            };
          },
        }),
      ],
    });
  } catch (error) {
    console.error('Error creating tRPC client:', error);
    try {
      const fallbackTrpc = getTrpcInstance();
      return fallbackTrpc.createClient({
        links: [
          httpLink({
            url: 'https://api.rork.app/api/trpc',
            transformer: superjson,
          }),
        ],
      });
    } catch (fallbackError) {
      console.error('Fallback tRPC client creation also failed:', fallbackError);
      throw error;
    }
  }
};

let clientInitialized = false;
let clientInitAttempts = 0;
const MAX_CLIENT_INIT_ATTEMPTS = 3;

export const getTrpcClient = (): ReturnType<typeof trpc.createClient> => {
  if (!trpcClientInstance || !clientInitialized) {
    clientInitAttempts++;
    try {
      trpcClientInstance = createTrpcClient();
      clientInitialized = true;
      console.log('tRPC client initialized successfully on attempt', clientInitAttempts);
    } catch (error) {
      console.error('Failed to create tRPC client on attempt', clientInitAttempts, ':', error);
      if (clientInitAttempts < MAX_CLIENT_INIT_ATTEMPTS) {
        console.log('Retrying tRPC client creation...');
        try {
          trpcClientInstance = createTrpcClient();
          clientInitialized = true;
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
          if (clientInitAttempts >= MAX_CLIENT_INIT_ATTEMPTS) {
            throw retryError;
          }
        }
      } else {
        throw error;
      }
    }
  }
  
  if (!trpcClientInstance) {
    throw new Error('Failed to initialize tRPC client');
  }
  
  return trpcClientInstance;
};

export const resetTrpcClient = () => {
  trpcClientInstance = null;
  clientInitialized = false;
  clientInitAttempts = 0;
};

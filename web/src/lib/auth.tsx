import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { APP_KEY, AUTH_URL } from './config';
import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
} from './authStorage';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  signIn: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => void;
  clearError: () => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function bytesToB64Url(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  let out = '';
  for (let i = 0; i < length; i++) out += chars.charAt(values[i] % chars.length);
  return out;
}

async function codeChallengeFor(verifier: string): Promise<string> {
  try {
    if (crypto?.subtle?.digest) {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      return bytesToB64Url(new Uint8Array(hash));
    }
  } catch {
    // fall through to plain challenge
  }
  return verifier;
}

/** Decode the JWT payload to extract user info and check expiration. */
function userFromToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
      exp?: number;
    };
    if (!payload.sub) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return {
      id: payload.sub,
      email: payload.email ?? '',
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const codeVerifierRef = useRef<string | null>(null);

  const refreshSession = useCallback(async (): Promise<void> => {
    const storedRefreshToken = getStoredRefreshToken();
    if (!storedRefreshToken) {
      setUser(null);
      return;
    }
    try {
      const response = await fetch(`${AUTH_URL}/oauth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_key: APP_KEY, refresh_token: storedRefreshToken }),
      });
      if (!response.ok) {
        clearStoredTokens();
        setUser(null);
        return;
      }
      const { access_token } = (await response.json()) as { access_token: string };
      setStoredTokens(access_token, storedRefreshToken);
      setUser(userFromToken(access_token));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async (): Promise<void> => {
      try {
        const accessToken = getStoredAccessToken();
        if (!accessToken) {
          if (getStoredRefreshToken()) await refreshSession();
          return;
        }
        const decoded = userFromToken(accessToken);
        if (decoded) {
          setUser(decoded);
        } else {
          await refreshSession();
        }
      } finally {
        setIsLoading(false);
      }
    };
    void bootstrap();
  }, [refreshSession]);

  const exchangeCode = useCallback(async (code: string): Promise<void> => {
    const verifier = codeVerifierRef.current;
    if (!verifier) return;
    codeVerifierRef.current = null;

    const response = await fetch(`${AUTH_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_key: APP_KEY, code, code_verifier: verifier }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `Sign in failed (${response.status})`);
      return;
    }
    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      user?: AuthUser;
    };
    setStoredTokens(data.access_token, data.refresh_token);
    setUser(data.user ?? userFromToken(data.access_token));
  }, []);

  const signIn = useCallback(
    async (provider: 'google' | 'apple'): Promise<void> => {
      if (!AUTH_URL || !APP_KEY) {
        setError('Sign-in is not configured for this site yet.');
        return;
      }
      setIsSigningIn(true);
      setError(null);
      try {
        const verifier = randomString(64);
        codeVerifierRef.current = verifier;
        const challenge = await codeChallengeFor(verifier);

        const response = await fetch(`${AUTH_URL}/oauth/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_key: APP_KEY,
            provider,
            code_challenge: challenge,
            target: 'rn',
            env: 'preview',
            app_path: 'web',
          }),
        });

        if (!response.ok) {
          codeVerifierRef.current = null;
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `Sign in failed (${response.status})`);
          return;
        }

        const { auth_url } = (await response.json()) as { auth_url: string };
        const popup = window.open(auth_url, '_blank', 'width=500,height=650');

        await new Promise<void>((resolve) => {
          const onMessage = (event: MessageEvent): void => {
            const data = event.data as { type?: string; code?: string } | null;
            if (data?.type !== 'rork_auth_callback') return;
            window.removeEventListener('message', onMessage);
            clearInterval(pollTimer);
            if (data.code) {
              void exchangeCode(data.code).then(resolve);
            } else {
              resolve();
            }
          };
          window.addEventListener('message', onMessage);
          const pollTimer = window.setInterval(() => {
            if (popup?.closed) {
              clearInterval(pollTimer);
              window.removeEventListener('message', onMessage);
              codeVerifierRef.current = null;
              resolve();
            }
          }, 500);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign in failed');
      } finally {
        setIsSigningIn(false);
      }
    },
    [exchangeCode]
  );

  const signOut = useCallback((): void => {
    clearStoredTokens();
    setUser(null);
  }, []);

  const clearError = useCallback((): void => setError(null), []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const token = getStoredAccessToken();
    if (token && userFromToken(token)) return token;
    await refreshSession();
    return getStoredAccessToken();
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isSigningIn, error, signIn, signOut, clearError, getAccessToken }),
    [user, isLoading, isSigningIn, error, signIn, signOut, clearError, getAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

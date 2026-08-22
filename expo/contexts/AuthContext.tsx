import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
  clearStoredTokens,
} from '@/lib/authStorage';

const AUTH_URL = process.env.EXPO_PUBLIC_RORK_AUTH_URL ?? '';
const APP_KEY = process.env.EXPO_PUBLIC_RORK_APP_KEY ?? '';
const PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID ?? '';
const CALLBACK_URL = `rork-${PROJECT_ID}://auth/callback`;

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64UrlDecode(segment: string): string {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob === 'function') {
    try {
      return atob(padded);
    } catch {
      // fall through to manual decoding
    }
  }
  let str = '';
  let bits = 0;
  let value = 0;
  for (const c of padded.replace(/=+$/, '')) {
    const idx = B64_CHARS.indexOf(c);
    if (idx < 0) continue;
    value = (value << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      str += String.fromCharCode((value >> bits) & 0xff);
    }
  }
  return str;
}

function bytesToB64Url(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  if (typeof btoa === 'function') {
    try {
      return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
      // fall through
    }
  }
  let out = '';
  let bits = 0;
  let value = 0;
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += B64_CHARS[(value >> bits) & 0x3f];
    }
  }
  if (bits > 0) out += B64_CHARS[(value << (6 - bits)) & 0x3f];
  return out;
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let out = '';
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

/** PKCE S256 challenge when Web Crypto is available (web); plain challenge otherwise. */
async function codeChallengeFor(verifier: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      return bytesToB64Url(new Uint8Array(hash));
    }
  } catch {}
  return verifier;
}

/** Decode the JWT payload to extract user info and check expiration. */
function userFromToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(b64UrlDecode(parts[1])) as {
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

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const codeVerifierRef = useRef<string | null>(null);

  const refreshToken = useCallback(async () => {
    const storedRefreshToken = await getStoredRefreshToken();
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
        await clearStoredTokens();
        setUser(null);
        return;
      }
      const { access_token } = (await response.json()) as { access_token: string };
      await setStoredTokens(access_token, storedRefreshToken);
      setUser(userFromToken(access_token));
    } catch {
      setUser(null);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const accessToken = await getStoredAccessToken();
      if (!accessToken) {
        if (await getStoredRefreshToken()) await refreshToken();
        return;
      }
      const decoded = userFromToken(accessToken);
      if (decoded) {
        setUser(decoded);
      } else {
        await refreshToken();
      }
    } catch (err) {
      console.log('Auth check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [refreshToken]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const exchangeCode = useCallback(async (code: string) => {
    const verifier = codeVerifierRef.current;
    if (!verifier) return;
    codeVerifierRef.current = null;

    const response = await fetch(`${AUTH_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_key: APP_KEY, code, code_verifier: verifier }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = (body as { error?: string }).error || `Sign in failed (${response.status})`;
      console.log('Auth token exchange failed:', response.status);
      setError(message);
      return;
    }
    const { access_token, refresh_token, user: userData } = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      user: AuthUser;
    };
    await setStoredTokens(access_token, refresh_token);
    setUser(userData ?? userFromToken(access_token));
  }, []);

  const handleCallbackUrl = useCallback(
    async (url: string) => {
      try {
        const parsed = new URL(url);
        if (parsed.pathname === '/auth/callback') {
          const code = parsed.searchParams.get('code');
          if (code) await exchangeCode(code);
        }
      } catch (err) {
        console.log('Auth callback handling failed:', err);
        setError(err instanceof Error ? err.message : 'Sign in failed');
      }
    },
    [exchangeCode]
  );

  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      void handleCallbackUrl(event.url);
    });
    return () => subscription.remove();
  }, [handleCallbackUrl]);

  const signIn = useCallback(
    async (provider: 'google' | 'apple') => {
      if (!AUTH_URL || !APP_KEY) {
        setError('Sign-in is not configured for this app yet.');
        return;
      }
      setIsSigningIn(true);
      setError(null);
      try {
        const verifier = randomString(64);
        codeVerifierRef.current = verifier;
        const challenge = await codeChallengeFor(verifier);

        const isWeb = Platform.OS === 'web';
        const target = 'rn';
        const env = isWeb ? 'preview' : 'native';

        const response = await fetch(`${AUTH_URL}/oauth/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_key: APP_KEY,
            provider,
            code_challenge: challenge,
            target,
            env,
            app_path: 'expo',
          }),
        });

        if (!response.ok) {
          codeVerifierRef.current = null;
          const body = await response.json().catch(() => ({}));
          const message = (body as { error?: string }).error || `Sign in failed (${response.status})`;
          setError(message);
          return;
        }

        const { auth_url } = (await response.json()) as { auth_url: string };

        if (isWeb) {
          const popup = window.open(auth_url, '_blank', 'width=500,height=650');
          await new Promise<void>((resolve) => {
            const onMessage = (event: MessageEvent) => {
              const data = event.data as { type?: string; code?: string } | null;
              if (data?.type !== 'rork_auth_callback') return;
              window.removeEventListener('message', onMessage);
              if (pollTimer) clearInterval(pollTimer);
              if (data.code) {
                void exchangeCode(data.code).then(resolve);
              } else {
                resolve();
              }
            };
            window.addEventListener('message', onMessage);
            const pollTimer = setInterval(() => {
              if (popup?.closed) {
                clearInterval(pollTimer);
                window.removeEventListener('message', onMessage);
                codeVerifierRef.current = null;
                resolve();
              }
            }, 500);
          });
        } else {
          const result = await WebBrowser.openAuthSessionAsync(auth_url, CALLBACK_URL);
          if (result.type === 'success' && result.url) {
            await handleCallbackUrl(result.url);
          }
        }
      } catch (err) {
        console.log('Sign in failed:', err);
        setError(err instanceof Error ? err.message : 'Sign in failed');
      } finally {
        setIsSigningIn(false);
      }
    },
    [exchangeCode, handleCallbackUrl]
  );

  const signOut = useCallback(async () => {
    await clearStoredTokens();
    setUser(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /** Current access token for authenticated API calls (cloud sync). */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const token = await getStoredAccessToken();
    if (token && userFromToken(token)) return token;
    // Expired — refresh then retry.
    await refreshToken();
    return getStoredAccessToken();
  }, [refreshToken]);

  return { user, isLoading, isSigningIn, error, signIn, signOut, clearError, getAccessToken };
});

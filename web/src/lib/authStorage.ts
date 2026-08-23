/** Browser token storage for the portal session. */

const ACCESS_KEY = 'zomi_portal_access_token';
const REFRESH_KEY = 'zomi_portal_refresh_token';

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode) — session stays in memory only
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const getStoredAccessToken = (): string | null => safeGet(ACCESS_KEY);
export const getStoredRefreshToken = (): string | null => safeGet(REFRESH_KEY);

export function setStoredTokens(accessToken: string, refreshToken: string): void {
  safeSet(ACCESS_KEY, accessToken);
  safeSet(REFRESH_KEY, refreshToken);
}

export function clearStoredTokens(): void {
  safeRemove(ACCESS_KEY);
  safeRemove(REFRESH_KEY);
}

/**
 * Token storage for Rork Auth.
 *
 * expo-secure-store is unavailable in Expo Go, so tokens live in AsyncStorage
 * (localStorage on web). Short-lived access tokens + refresh tokens only —
 * no passwords or secrets are stored.
 */
let storage: typeof import('@react-native-async-storage/async-storage').default | null = null;

const getStorage = async () => {
  if (storage) return storage;
  try {
    const m = await import('@react-native-async-storage/async-storage');
    storage = m.default;
    return storage;
  } catch {
    return null;
  }
};

const ACCESS_KEY = '@zomi_auth_access_token';
const REFRESH_KEY = '@zomi_auth_refresh_token';

export async function getStoredAccessToken(): Promise<string | null> {
  try {
    const s = await getStorage();
    return s ? await s.getItem(ACCESS_KEY) : null;
  } catch {
    return null;
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    const s = await getStorage();
    return s ? await s.getItem(REFRESH_KEY) : null;
  } catch {
    return null;
  }
}

export async function setStoredTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    const s = await getStorage();
    if (s) {
      await s.setItem(ACCESS_KEY, accessToken);
      await s.setItem(REFRESH_KEY, refreshToken);
    }
  } catch {}
}

export async function clearStoredTokens(): Promise<void> {
  try {
    const s = await getStorage();
    if (s) {
      await s.removeItem(ACCESS_KEY);
      await s.removeItem(REFRESH_KEY);
    }
  } catch {}
}

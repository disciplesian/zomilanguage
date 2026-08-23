import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Stable per-device identifier for the anonymous translation free tier.
 * Generated once and persisted so the 1,500-word guest allowance is tracked
 * across app restarts. Sent to the backend with every translation request.
 */
const STORAGE_KEY = '@zomi_anonymous_id';

export async function getAnonymousId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const generated = `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    await AsyncStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    return 'anonymous';
  }
}

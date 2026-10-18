/**
 * Stable per-browser identifier for the guest daily free allowance.
 * Generated once and kept in localStorage.
 */
const STORAGE_KEY = 'zomi_anonymous_id';

export function getAnonymousId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    return 'anonymous';
  }
}

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Privacy-safe problem reports. Sends only a scrubbed error signature, the
 * screen and app version — never user ids, device ids, or translated text.
 */

type ProblemKind = 'crash' | 'error' | 'slow';

const API_BASE = (() => {
  const url =
    process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL ||
    process.env.EXPO_PUBLIC_RORK_API_BASE_URL ||
    'https://zomilanguage-backend.rork.app';
  return url.endsWith('/') ? url.slice(0, -1) : url;
})();

const MAX_PER_SESSION = 10;
const sent = new Set<string>();

function scrub(raw: string): string {
  return raw
    .replace(/(["'`“”‘’])(?:(?!\1).){0,400}\1/g, '…')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/** Reports one problem (deduplicated per session, capped, fire-and-forget). */
export function reportProblem(kind: ProblemKind, message: string, screen = ''): void {
  try {
    const signature = scrub(message);
    if (!signature || sent.size >= MAX_PER_SESSION) return;
    const key = `${kind}|${signature}`;
    if (sent.has(key)) return;
    sent.add(key);
    void fetch(`${API_BASE}/api/telemetry/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'expo',
        appVersion: `${Constants.expoConfig?.version ?? ''} ${Platform.OS}`.trim(),
        kind,
        signature,
        screen,
      }),
    }).catch(() => undefined);
  } catch {
    // Reporting must never break the app.
  }
}

interface ErrorUtilsShape {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
}

let installed = false;

/** Chains onto React Native's global JS error handler to report fatal errors. */
export function installProblemReporting(): void {
  if (installed || Platform.OS === 'web') return;
  installed = true;
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    reportProblem(isFatal ? 'crash' : 'error', `${error?.name ?? 'Error'}: ${error?.message ?? ''}`);
    previous(error, isFatal);
  });
}

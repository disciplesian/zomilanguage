import { API_BASE_URL } from '@/lib/config';

/**
 * Privacy-safe problem reports. Sends only a short error signature (quoted
 * text and numbers stripped here and again on the server), the page name and
 * the app version — never user ids, device ids, or translated text.
 */

type ProblemKind = 'crash' | 'error' | 'slow';

const APP_VERSION = '1.2.0';
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

function currentScreen(): string {
  const path = window.location.pathname.split('/')[1] ?? '';
  return path === 't' ? 'shared' : path || 'translate';
}

/** Reports one problem (deduplicated per session, capped, fire-and-forget). */
export function reportProblem(kind: ProblemKind, message: string): void {
  try {
    const signature = scrub(message);
    if (!signature || sent.size >= MAX_PER_SESSION) return;
    const key = `${kind}|${signature}`;
    if (sent.has(key)) return;
    sent.add(key);
    const body = JSON.stringify({
      platform: 'web',
      appVersion: APP_VERSION,
      kind,
      signature,
      screen: currentScreen(),
    });
    const url = `${API_BASE_URL}/api/telemetry/problems`;
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.(url, blob)) {
      void fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(
        () => undefined
      );
    }
  } catch {
    // Reporting must never break the app.
  }
}

function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  return typeof value === 'string' ? value : 'Unknown error';
}

/** Installs global handlers for uncaught errors and unhandled promise rejections. */
export function installProblemReporting(): void {
  window.addEventListener('error', (event) => {
    // Ignore failed resource loads (images, scripts from extensions).
    if (!(event instanceof ErrorEvent) || !event.message) return;
    reportProblem('error', describe(event.error ?? event.message));
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = describe(event.reason);
    if (/abort/i.test(reason)) return;
    reportProblem('error', reason);
  });
}

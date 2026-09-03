/**
 * Public runtime configuration for the Zomi Language Portal web app.
 *
 * These values are all client-side public identifiers (the same ones shipped
 * inside the mobile bundles). Vite env vars take precedence so the deployment
 * can override them without a code change.
 */

const env = import.meta.env as Record<string, string | undefined>;

function pick(name: string, fallback: string): string {
  const value = env[name];
  return value && value.length > 0 ? value.replace(/\/$/, '') : fallback;
}

export const AUTH_URL: string = pick('VITE_RORK_AUTH_URL', 'https://api.rork.com');

export const APP_KEY: string = pick(
  'VITE_RORK_APP_KEY',
  'rpk_sh3poliek53gzkv6oqmgz29xoc77qpbi'
);

export const PROJECT_ID: string = pick('VITE_PROJECT_ID', 'c71czcicbp014dj0l1fu3');

export const API_BASE_URL: string = pick(
  'VITE_RORK_API_BASE_URL',
  'https://dev-c71czcicbp014dj0l1fu3.rorktest.dev'
);

export const SUPPORT_EMAIL = 'support@zomitranslator.com';

export const APP_NAME = 'Zomi Language Portal';

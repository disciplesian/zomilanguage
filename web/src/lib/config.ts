/**
 * Public runtime configuration for the Zomi Translator web app.
 *
 * These values are all client-side public identifiers (the same ones shipped
 * inside the mobile bundles). Vite env vars take precedence so the deployment
 * can override them without a code change.
 */

function pick(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value.replace(/\/$/, '') : fallback;
}

export const AUTH_URL: string = pick(import.meta.env.VITE_RORK_AUTH_URL as string | undefined, 'https://api.rork.com');

export const APP_KEY: string = pick(
  import.meta.env.VITE_RORK_APP_KEY as string | undefined,
  'rpk_sh3poliek53gzkv6oqmgz29xoc77qpbi'
);

export const PROJECT_ID: string = pick(import.meta.env.VITE_PROJECT_ID as string | undefined, 'c71czcicbp014dj0l1fu3');

export const API_BASE_URL: string = pick(
  import.meta.env.VITE_RORK_API_BASE_URL as string | undefined,
  '/~api'
);

export const SUPPORT_EMAIL = 'support@zomitranslator.com';

export const APP_NAME = 'Zomi Translator';

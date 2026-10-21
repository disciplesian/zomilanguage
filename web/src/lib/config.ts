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

/** Official Rork-hosted site and backend (used when the same build runs on another host). */
const OFFICIAL_SITE = 'https://zomilanguage.rork.app';
const DIRECT_BACKEND = 'https://zomilanguage-backend.rork.app';

/**
 * True when this exact build runs off Rork hosting (e.g. the zomitranslator.com
 * cPanel mirror). There is no /~api proxy there, so the backend is called
 * directly (its CORS list allows those domains).
 */
const SELF_HOSTED: boolean = (() => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'zomitranslator.com' || host.endsWith('.zomitranslator.com');
})();

export const API_BASE_URL: string = pick(
  import.meta.env.VITE_RORK_API_BASE_URL as string | undefined,
  SELF_HOSTED ? DIRECT_BACKEND : '/~api'
);

/**
 * Set on self-hosted copies: sign-in opens the official site, because the
 * sign-in service only accepts requests from Rork-hosted addresses.
 */
export const SIGN_IN_HOME: string = pick(
  import.meta.env.VITE_SIGN_IN_HOME as string | undefined,
  SELF_HOSTED ? OFFICIAL_SITE : ''
);

export const SUPPORT_EMAIL = 'support@zomitranslator.com';

export const APP_NAME = 'Zomi Translator';

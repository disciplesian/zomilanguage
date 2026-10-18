import { Platform } from 'react-native';

/**
 * Client for the Zomi Language Portal backend routes (roles, verification,
 * admin dashboard). All calls require the signed-in user's access token.
 */

export type PortalRole = 'user' | 'moderator' | 'admin';
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface PortalProfile {
  userId: string;
  email: string;
  name: string | null;
  role: PortalRole;
  verified: boolean;
  verificationStatus: VerificationStatus;
  translationCount: number;
  joinedAt: string;
}

export interface PortalUserRecord {
  userId: string;
  email: string;
  name: string | null;
  role: PortalRole;
  verified: boolean;
  verificationStatus: VerificationStatus;
  verificationReason: string;
  requestedAt: string | null;
  translationCount: number;
  joinedAt: string;
}

export interface AdminOverview {
  totalUsers: number;
  totalTranslations: number;
  translationsToday: number;
  verifiedUsers: number;
  pendingVerifications: number;
  topUsers: { userId: string; email: string; name: string | null; total: number }[];
  recentTranslations: {
    userId: string;
    email: string;
    name: string | null;
    sourceText: string;
    translatedText: string;
    targetLanguage: string;
    model: string | null;
    confidence: number;
    wordCount: number;
    createdAt: string;
  }[];
}

const getBaseUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL || process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (url && url.length > 0) return url.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'https://zomilanguage-backend.rork.app';
};

async function portalFetch(
  path: string,
  token: string,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = String(body.error ?? `HTTP ${res.status}`);
    if (code === 'unauthorized') {
      throw new Error('Your session expired. Please sign in again.');
    }
    if (code === 'forbidden') {
      throw new Error('You do not have permission to do this.');
    }
    throw new Error(code);
  }
  return body;
}

export async function fetchPortalProfile(token: string): Promise<PortalProfile> {
  const body = await portalFetch('/api/portal/me', token);
  return {
    userId: String(body.userId ?? ''),
    email: String(body.email ?? ''),
    name: (body.name as string | null) || null,
    role: (body.role as PortalRole) ?? 'user',
    verified: body.verified === true,
    verificationStatus: (body.verificationStatus as VerificationStatus) ?? 'none',
    translationCount: Number(body.translationCount ?? 0),
    joinedAt: String(body.joinedAt ?? ''),
  };
}

export async function requestVerification(token: string, reason: string): Promise<void> {
  await portalFetch('/api/portal/verification/request', token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function fetchAdminOverview(token: string): Promise<AdminOverview> {
  const body = await portalFetch('/api/admin/overview', token);
  return {
    totalUsers: Number(body.totalUsers ?? 0),
    totalTranslations: Number(body.totalTranslations ?? 0),
    translationsToday: Number(body.translationsToday ?? 0),
    verifiedUsers: Number(body.verifiedUsers ?? 0),
    pendingVerifications: Number(body.pendingVerifications ?? 0),
    topUsers: Array.isArray(body.topUsers) ? (body.topUsers as AdminOverview['topUsers']) : [],
    recentTranslations: Array.isArray(body.recentTranslations)
      ? (body.recentTranslations as AdminOverview['recentTranslations'])
      : [],
  };
}

export async function fetchAdminUsers(token: string): Promise<PortalUserRecord[]> {
  const body = await portalFetch('/api/admin/users', token);
  return Array.isArray(body.users) ? (body.users as PortalUserRecord[]) : [];
}

export async function setAdminUserRole(
  token: string,
  userId: string,
  role: PortalRole
): Promise<void> {
  await portalFetch('/api/admin/role', token, {
    method: 'POST',
    body: JSON.stringify({ userId, role }),
  });
}

export async function decideAdminVerification(
  token: string,
  userId: string,
  decision: 'approve' | 'reject'
): Promise<void> {
  await portalFetch('/api/admin/verification', token, {
    method: 'POST',
    body: JSON.stringify({ userId, decision }),
  });
}

export interface EntryExample {
  english: string;
  zomi: string;
}

/**
 * Fetches two AI-generated example sentences (English + Zomi) for a verified
 * dictionary entry. Guests are served while their anonymous free-tier
 * allowance lasts; viewing examples does not draw it down.
 */
export async function fetchEntryExamples(
  entry: { english: string; zomi: string; pos?: string },
  opts?: { authToken?: string; anonymousId?: string }
): Promise<EntryExample[]> {
  const res = await fetch(`${getBaseUrl()}/api/dictionary/examples`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.authToken ? { Authorization: `Bearer ${opts.authToken}` } : {}),
      ...(opts?.anonymousId ? { 'X-Anonymous-Id': opts.anonymousId } : {}),
    },
    body: JSON.stringify({
      english: entry.english,
      zomi: entry.zomi,
      pos: entry.pos ?? '',
      anonymousId: opts?.anonymousId ?? '',
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(body.error ?? `HTTP ${res.status}`));
  return Array.isArray(body.examples) ? (body.examples as EntryExample[]) : [];
}

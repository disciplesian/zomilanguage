import { API_BASE_URL } from './config';

/** Client for the Zomi Language Portal backend (roles, verification, admin). */

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

async function portalFetch(
  path: string,
  token: string,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
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
    if (code === 'unauthorized' || code === 'sign_in_required') {
      throw new Error('Your session expired. Please sign in again.');
    }
    if (code === 'forbidden') throw new Error('You do not have permission to do this.');
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

export interface TranslationResult {
  text: string;
  model: string | null;
  confidence: number;
  usage?: UsageInfo;
}

export interface UsageInfo {
  authed: boolean;
  wordsUsed: number;
  wordLimit: number;
}

/** Machine-readable marker thrown when the anonymous free tier is exhausted. */
export const WORD_LIMIT_ERROR = 'WORD_LIMIT_REACHED';

/**
 * Streams a translation from the backend. Signed-in members translate without
 * limits; anonymous visitors draw down their 1,500-word free allowance via
 * `anonymousId` and are asked to sign in once it runs out.
 */
export async function streamTranslation(
  input: {
    text: string;
    targetLanguage: 'english' | 'zomi';
    token?: string | null;
    anonymousId?: string | null;
  },
  onDelta: (chunk: string) => void,
  signal?: AbortSignal
): Promise<TranslationResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/translate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
        ...(input.anonymousId ? { 'X-Anonymous-Id': input.anonymousId } : {}),
      },
      body: JSON.stringify({
        text: input.text,
        targetLanguage: input.targetLanguage,
        anonymousId: input.anonymousId ?? undefined,
      }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error('Translation service is unreachable. Please check your connection and try again.');
  }

  if (res.status === 401) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.error === 'word_limit_reached') throw new Error(WORD_LIMIT_ERROR);
    throw new Error('Your session expired. Please sign in again.');
  }
  if (!res.ok || !res.body) throw new Error(`Translation failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamed = '';
  let result: TranslationResult = { text: '', model: null, confidence: 0 };

  const handleEvent = (rawEvent: string): void => {
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of rawEvent.split('\n')) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
    } catch {
      return;
    }
    if (eventName === 'delta') {
      const piece = String(payload.text ?? '');
      streamed += piece;
      onDelta(piece);
    } else if (eventName === 'done') {
      const finalText = String(payload.text ?? '') || streamed;
      result = {
        text: finalText,
        model: (payload.model as string | null) ?? null,
        confidence: Number(payload.confidence ?? 0),
      };
    } else if (eventName === 'usage') {
      result = {
        ...result,
        usage: {
          authed: payload.authed === true,
          wordsUsed: Number(payload.wordsUsed ?? 0),
          wordLimit: Number(payload.wordLimit ?? 0),
        },
      };
    } else if (eventName === 'error') {
      throw new Error(String(payload.message ?? 'Translation failed'));
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      handleEvent(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim().length > 0) handleEvent(buffer);

  if (!result.text) result = { text: streamed, model: result.model, confidence: 90 };
  if (!result.text) throw new Error('No translation was returned. Please try again.');
  return result;
}

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

/** Retries a fetch on transient network errors with exponential backoff. */
async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 2,
  onRetry?: () => void
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      // Retry on 5xx / 0-ish network errors, but not on 4xx (auth/bad request).
      if (res.status >= 500 && res.status < 600 && attempt < retries) {
        onRetry?.();
        await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Never retry an explicit abort — the caller already cancelled.
      if (lastError.name === 'AbortError' || (init?.signal?.aborted ?? false)) {
        throw lastError;
      }
      if (attempt < retries) {
        onRetry?.();
        await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
      }
    }
  }
  throw lastError ?? new Error('Network request failed');
}

async function portalFetch(
  path: string,
  token: string,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  const res = await fetchWithRetry(`${API_BASE_URL}${path}`, {
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

export interface AdminUsageModelRow {
  model: string;
  requests: number;
  errors: number;
  promptTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface AdminUsageDayRow {
  day: string;
  requests: number;
  errors: number;
  promptTokens: number;
  outputTokens: number;
}

export type UsageAlertLevel = 'ok' | 'warning' | 'critical';

export interface AdminUsage {
  today: {
    date: string;
    requests: number;
    errors: number;
    promptTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  };
  byModel: AdminUsageModelRow[];
  rate: {
    requestsPerMinute: number;
    errorsPerMinute: number;
    tokensPerMinute: number;
    level: UsageAlertLevel;
    reasons: string[];
    thresholds: { rpmWarn: number; rpmCritical: number; errorsWarn: number; errorsCritical: number };
  };
  pricing: { inputUsdPerMillion: number; outputUsdPerMillion: number };
  lastFlushError: string;
  history: AdminUsageDayRow[];
  persistAvailable: boolean;
}

export async function fetchAdminUsage(token: string): Promise<AdminUsage> {
  const body = (await portalFetch('/api/admin/usage', token)) as {
    today?: Partial<AdminUsage['today']>;
    byModel?: unknown;
    rate?: Partial<AdminUsage['rate']>;
    pricing?: Partial<AdminUsage['pricing']>;
    lastFlushError?: unknown;
    history?: unknown;
    persistAvailable?: unknown;
  };
  return {
    today: {
      date: String(body.today?.date ?? ''),
      requests: Number(body.today?.requests ?? 0),
      errors: Number(body.today?.errors ?? 0),
      promptTokens: Number(body.today?.promptTokens ?? 0),
      outputTokens: Number(body.today?.outputTokens ?? 0),
      estimatedCostUsd: Number(body.today?.estimatedCostUsd ?? 0),
    },
    byModel: Array.isArray(body.byModel)
      ? (body.byModel as AdminUsageModelRow[]).map((row) => ({
          model: String(row.model ?? 'unknown'),
          requests: Number(row.requests ?? 0),
          errors: Number(row.errors ?? 0),
          promptTokens: Number(row.promptTokens ?? 0),
          outputTokens: Number(row.outputTokens ?? 0),
          estimatedCostUsd: Number(row.estimatedCostUsd ?? 0),
        }))
      : [],
    rate: {
      requestsPerMinute: Number(body.rate?.requestsPerMinute ?? 0),
      errorsPerMinute: Number(body.rate?.errorsPerMinute ?? 0),
      tokensPerMinute: Number(body.rate?.tokensPerMinute ?? 0),
      level: (body.rate?.level as UsageAlertLevel) ?? 'ok',
      reasons: Array.isArray(body.rate?.reasons) ? (body.rate.reasons as string[]) : [],
      thresholds: {
        rpmWarn: Number(body.rate?.thresholds?.rpmWarn ?? 8),
        rpmCritical: Number(body.rate?.thresholds?.rpmCritical ?? 12),
        errorsWarn: Number(body.rate?.thresholds?.errorsWarn ?? 3),
        errorsCritical: Number(body.rate?.thresholds?.errorsCritical ?? 6),
      },
    },
    pricing: {
      inputUsdPerMillion: Number(body.pricing?.inputUsdPerMillion ?? 0.3),
      outputUsdPerMillion: Number(body.pricing?.outputUsdPerMillion ?? 2.5),
    },
    lastFlushError: String(body.lastFlushError ?? ''),
    history: Array.isArray(body.history) ? (body.history as AdminUsageDayRow[]) : [],
    persistAvailable: body.persistAvailable === true,
  };
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

export interface DictionaryDatasetStatus {
  available: boolean;
  version: number;
  count: number;
  updatedAt: string;
  updatedBy: string;
  note: string | null;
  fileName: string | null;
}

/** Admin: status of the published dictionary dataset (version, count, updated). */
export async function fetchAdminDictionary(token: string): Promise<DictionaryDatasetStatus> {
  const body = await portalFetch('/api/admin/dictionary', token);
  if (body.available !== true) {
    return { available: false, version: 0, count: 0, updatedAt: '', updatedBy: '', note: null, fileName: null };
  }
  return {
    available: true,
    version: Number(body.version ?? 0),
    count: Number(body.count ?? 0),
    updatedAt: String(body.updatedAt ?? ''),
    updatedBy: String(body.updatedBy ?? ''),
    note: (body.note as string | null) || null,
    fileName: (body.fileName as string | null) || null,
  };
}

/** Admin: publish a new dictionary dataset version (payload is the normalized
 *  dictionary JSON built from the uploaded file). */
export async function importAdminDictionary(
  token: string,
  payload: string,
  fileName: string,
  note: string
): Promise<{ version: number; count: number }> {
  const body = await portalFetch('/api/admin/dictionary/import', token, {
    method: 'POST',
    body: JSON.stringify({ payload, fileName, note }),
  });
  return { version: Number(body.version ?? 0), count: Number(body.count ?? 0) };
}

/** Admin: record that a dataset export was downloaded (CSV or JSON bundle). */
export async function logDictionaryExport(
  token: string,
  format: 'csv' | 'json',
  count: number,
  scope: 'bundled' | 'import'
): Promise<void> {
  await portalFetch('/api/admin/dictionary/export', token, {
    method: 'POST',
    body: JSON.stringify({ format, count, scope }),
  });
}

export interface AuditEvent {
  id: string;
  action: string;
  userId: string;
  email: string;
  details: Record<string, unknown>;
  createdAt: string;
}

/** Admin: the central audit trail — recent admin actions with the acting
 *  user's ID, the specific action and its details. */
export async function fetchAuditLog(token: string): Promise<AuditEvent[]> {
  const body = await portalFetch('/api/admin/audit-log', token);
  return Array.isArray(body.events) ? (body.events as AuditEvent[]) : [];
}

export interface DictionaryVersion {
  version: number;
  kind: string;
  fileName: string;
  note: string;
  totalRows: number;
  createdBy: string;
  createdAt: string;
}

/** Admin: version history — every upload and entry mutation, newest first. */
export async function fetchDictionaryHistory(token: string): Promise<DictionaryVersion[]> {
  const body = await portalFetch('/api/admin/dictionary/history', token);
  return Array.isArray(body.versions) ? (body.versions as DictionaryVersion[]) : [];
}

export interface PublishedDictionary {
  available: boolean;
  version: number;
  count: number;
  entries: string[][];
}

/** Admin: the full published dataset (source of truth for entry editing). */
export async function fetchAdminDictionaryEntries(token: string): Promise<PublishedDictionary> {
  const body = await portalFetch('/api/admin/dictionary/entries', token);
  if (body.available !== true) {
    return { available: false, version: 0, count: 0, entries: [] };
  }
  return {
    available: true,
    version: Number(body.version ?? 0),
    count: Number(body.count ?? 0),
    entries: Array.isArray(body.entries) ? (body.entries as string[][]) : [],
  };
}

/** Admin: add one entry to the published dataset. */
export async function addDictionaryEntry(token: string, entry: string[]): Promise<void> {
  await portalFetch('/api/admin/dictionary/entry', token, {
    method: 'POST',
    body: JSON.stringify({ entry }),
  });
}

/** Admin: edit one entry (original identifies the row to replace). */
export async function editDictionaryEntry(
  token: string,
  original: string[],
  entry: string[]
): Promise<void> {
  await portalFetch('/api/admin/dictionary/entry', token, {
    method: 'PUT',
    body: JSON.stringify({ original, entry }),
  });
}

/** Admin: delete one entry from the published dataset. */
export async function deleteDictionaryEntry(token: string, original: string[]): Promise<void> {
  await portalFetch('/api/admin/dictionary/entry', token, {
    method: 'DELETE',
    body: JSON.stringify({ original }),
  });
}

export interface LatestDictionary {
  version: number;
  count: number;
  entries: unknown;
}

/** Public: the latest published dictionary dataset (no auth). Used by the
 *  Dictionary page at startup to refresh the local dataset over the air. */
export async function fetchLatestDictionary(): Promise<LatestDictionary | null> {
  try {
    const res = await fetchWithRetry(`${API_BASE_URL}/api/dictionary/latest`);
    if (!res.ok) return null;
    const body = (await res.json()) as {
      available?: boolean;
      version?: number;
      count?: number;
      payload?: string;
    };
    if (body.available !== true || typeof body.payload !== 'string') return null;
    const parsed = JSON.parse(body.payload) as { entries?: unknown };
    if (!Array.isArray(parsed.entries) || parsed.entries.length === 0) return null;
    return {
      version: Number(body.version ?? 0),
      count: Number(body.count ?? 0),
      entries: parsed.entries,
    };
  } catch {
    return null;
  }
}

export interface EntryExample {
  english: string;
  zomi: string;
}

/**
 * Fetches two AI-generated example sentences (English + Zomi) for a verified
 * dictionary entry. Public endpoint: guests are served while their anonymous
 * free-tier allowance lasts; viewing examples does not draw it down.
 */
export async function fetchEntryExamples(
  entry: { english: string; zomi: string; pos?: string },
  opts?: { token?: string | null; anonymousId?: string | null; signal?: AbortSignal }
): Promise<EntryExample[]> {
  let res: Response;
  try {
    res = await fetchWithRetry(`${API_BASE_URL}/api/dictionary/examples`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        ...(opts?.anonymousId ? { 'X-Anonymous-Id': opts.anonymousId } : {}),
      },
      body: JSON.stringify({
        english: entry.english,
        zomi: entry.zomi,
        pos: entry.pos ?? '',
        anonymousId: opts?.anonymousId ?? '',
      }),
      signal: opts?.signal,
    });
  } catch (err) {
    if (opts?.signal?.aborted) throw err;
    throw new Error('offline');
  }
  if (!res.ok) throw new Error(String((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`));
  const body = (await res.json()) as { examples?: EntryExample[] };
  return Array.isArray(body.examples) ? body.examples : [];
}

export interface TranslationResult {
  text: string;
  model: string | null;
  confidence: number;
  alternatives: string[];
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
    sourceLanguage?: string;
    targetLanguage: string;
    token?: string | null;
    anonymousId?: string | null;
  },
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
  onRetry?: () => void
): Promise<TranslationResult> {
  let res: Response;
  try {
    // 3 retries: the backend host occasionally returns transient 503s under
    // capacity pressure, so ride out short blips instead of failing fast.
    res = await fetchWithRetry(
      `${API_BASE_URL}/api/translate/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
          ...(input.anonymousId ? { 'X-Anonymous-Id': input.anonymousId } : {}),
        },
        body: JSON.stringify({
          text: input.text,
          sourceLanguage: input.sourceLanguage ?? 'auto',
          targetLanguage: input.targetLanguage,
          anonymousId: input.anonymousId ?? undefined,
        }),
        signal,
      },
      3,
      onRetry
    );
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
  let result: TranslationResult = { text: '', model: null, confidence: 0, alternatives: [] };

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
      const alternatives = Array.isArray(payload.alternatives)
        ? payload.alternatives
            .map((a) => (typeof a === 'string' ? a.trim() : ''))
            .filter((a) => a.length > 0 && a !== finalText)
            .slice(0, 2)
        : [];
      result = {
        text: finalText,
        model: (payload.model as string | null) ?? null,
        confidence: Number(payload.confidence ?? 0),
        alternatives: [...new Set(alternatives)],
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

  if (!result.text) result = { text: streamed, model: result.model, confidence: 90, alternatives: result.alternatives };
  if (!result.text) throw new Error('No translation was returned. Please try again.');
  return result;
}

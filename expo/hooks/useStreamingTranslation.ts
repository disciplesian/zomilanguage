import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
// @ts-ignore - no types shipped
import RNEventSource from 'react-native-sse';

type StreamState = {
  text: string;
  model: string | null;
  isStreaming: boolean;
  isRetrying: boolean;
  error: string | null;
  done: boolean;
  confidence: number;
  alternatives: string[];
};

export type StreamResult = {
  ok: boolean;
  text: string;
  model: string | null;
  error: string | null;
  confidence: number;
  alternatives: string[];
  usage?: { authed: boolean; wordsUsed: number; wordLimit: number };
};

const initialState: StreamState = {
  text: '',
  model: null,
  isStreaming: false,
  isRetrying: false,
  error: null,
  done: false,
  confidence: 0,
  alternatives: [],
};

/** Transient network blips are retried automatically (up to 2 retries). */
const MAX_RETRIES = 2;

/** Errors that must never be retried (quota, auth, and cancellations). */
const NON_RETRYABLE = /cancelled|word.?limit|401|unauthorized|sign.?in|forbidden|400|429|quota|rate.?limit/i;

const getBaseUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL || process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (url && url.length > 0) return url.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'https://zomilanguage-backend.rork.app';
};

/** Normalizes an "alternatives" payload from the done event. */
function parseAlternatives(raw: unknown, primary: string): string[] {
  if (!Array.isArray(raw)) return [];
  const list = raw
    .map((a) => (typeof a === 'string' ? a.trim() : ''))
    .filter((a) => a.length > 0 && a !== primary)
    .slice(0, 2);
  return [...new Set(list)];
}

/**
 * Streams a translation token-by-token from the backend SSE endpoint.
 * - Web: fetch + ReadableStream parser (POST body required, so we don't use window.EventSource).
 * - Native: react-native-sse (supports POST with body).
 *
 * The endpoint is POST /api/translate/stream and emits SSE events:
 *   start { model }, delta { text }, confidence { confidence },
 *   done { text, model, confidence, alternatives }, error { code, message }
 *
 * When the connection fails before any text arrives (network blip, transient
 * 5xx), the request is retried automatically and `isRetrying` becomes true so
 * the UI can show a "Connecting..." indicator.
 *
 * `start` returns a Promise that resolves once the stream finishes (success or error).
 */
export function useStreamingTranslation() {
  const [state, setState] = useState<StreamState>(initialState);
  const abortRef = useRef<AbortController | null>(null);
  const esRef = useRef<RNEventSource | null>(null);
  const tokenRef = useRef(0);

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
      abortRef.current = null;
    }
    if (esRef.current) {
      try { esRef.current.close(); } catch {}
      esRef.current = null;
    }
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  const start = useCallback(
    (
      text: string,
      targetLanguage: string,
      options?: {
        sourceLanguage?: string;
        extraGlossary?: Record<string, string>;
        authToken?: string;
        anonymousId?: string;
      }
    ): Promise<StreamResult> => {
      cancel();
      const myToken = ++tokenRef.current;
      setState({ ...initialState, isStreaming: true });

      const url = `${getBaseUrl()}/api/translate/stream`;
      const body = JSON.stringify({
        text,
        sourceLanguage: options?.sourceLanguage ?? 'auto',
        targetLanguage,
        extraGlossary: options?.extraGlossary ?? {},
        anonymousId: options?.anonymousId,
      });

      // Local accumulators (do not rely on async setState for resolution).
      let accText = '';
      let modelName: string | null = null;
      let confidenceVal = 0;
      let alternativesVal: string[] = [];
      let usageVal: StreamResult['usage'];
      let connected = false;

      return new Promise<StreamResult>((resolve) => {
        const finish = (result: StreamResult) => {
          if (myToken !== tokenRef.current) return resolve({ ok: false, text: '', model: null, error: 'cancelled', confidence: 0, alternatives: [] });
          if (result.ok) {
            setState({
              text: result.text,
              model: result.model,
              isStreaming: false,
              isRetrying: false,
              error: null,
              done: true,
              confidence: result.confidence,
              alternatives: result.alternatives,
            });
          } else {
            setState({
              text: accText,
              model: modelName,
              isStreaming: false,
              isRetrying: false,
              error: result.error,
              done: false,
              confidence: confidenceVal,
              alternatives: alternativesVal,
            });
          }
          resolve(result.usage ? { ...result, usage: result.usage } : result);
        };

        /** Connection failed — retry transient errors before giving up. */
        const fail = (msg: string) => {
          if (myToken !== tokenRef.current) return;
          const retryable =
            !connected &&
            accText.length === 0 &&
            !NON_RETRYABLE.test(msg);
          if (retryable) {
            // Attempt number is tracked via a closure counter below.
            scheduleRetry(msg);
            return;
          }
          finish({ ok: false, text: accText, model: modelName, error: msg, confidence: confidenceVal, alternatives: alternativesVal });
        };

        let attemptNo = 0;
        const scheduleRetry = (msg: string) => {
          if (attemptNo >= MAX_RETRIES) {
            finish({ ok: false, text: accText, model: modelName, error: msg, confidence: confidenceVal, alternatives: alternativesVal });
            return;
          }
          const delay = 800 * 2 ** attemptNo;
          attemptNo += 1;
          setState((prev) => ({ ...prev, isRetrying: true }));
          setTimeout(() => {
            if (myToken !== tokenRef.current) return;
            openStream();
          }, delay);
        };

        const onStart = (m: string) => {
          if (myToken !== tokenRef.current) return;
          connected = true;
          modelName = m;
          setState((prev) => ({ ...prev, model: m, isRetrying: false }));
        };
        const onDelta = (piece: string) => {
          if (myToken !== tokenRef.current) return;
          connected = true;
          accText += piece;
          setState((prev) => ({ ...prev, text: prev.text + piece, isRetrying: false }));
        };
        const onConfidence = (c: number) => {
          if (myToken !== tokenRef.current) return;
          confidenceVal = c;
        };
        const onUsage = (u: StreamResult['usage']) => {
          usageVal = u;
        };
        const onDone = (full: string, m: string, c?: number, alts?: string[]) => {
          if (typeof c === 'number' && c > 0) confidenceVal = c;
          if (Array.isArray(alts)) alternativesVal = alts;
          finish({
            ok: true,
            text: full || accText,
            model: m || modelName,
            error: null,
            confidence: confidenceVal,
            alternatives: alternativesVal,
            usage: usageVal,
          });
        };

        const parseSSEFrame = (frame: string) => {
          let event = 'message';
          let data = '';
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (!data) return;
          try {
            const parsed = JSON.parse(data);
            if (event === 'start' && parsed.model) onStart(parsed.model);
            else if (event === 'delta' && typeof parsed.text === 'string') onDelta(parsed.text);
            else if (event === 'confidence' && typeof parsed.confidence === 'number') onConfidence(parsed.confidence);
            else if (event === 'usage' && typeof parsed === 'object' && parsed !== null) {
              onUsage({
                authed: parsed.authed === true,
                wordsUsed: typeof parsed.wordsUsed === 'number' ? parsed.wordsUsed : 0,
                wordLimit: typeof parsed.wordLimit === 'number' ? parsed.wordLimit : 0,
              });
            }
            else if (event === 'done') onDone(
              parsed.text ?? '',
              parsed.model ?? '',
              typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
              parseAlternatives(parsed.alternatives, parsed.text ?? '')
            );
            else if (event === 'error') fail(parsed.message ?? parsed.code ?? 'stream_error');
          } catch {
            // ignore malformed frames
          }
        };

        const openStream = (): void => {
          if (Platform.OS === 'web') {
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            (async () => {
              try {
                const reqHeaders: Record<string, string> = {
                  'Content-Type': 'application/json',
                  Accept: 'text/event-stream',
                };
                if (options?.authToken) reqHeaders.Authorization = `Bearer ${options.authToken}`;
                if (options?.anonymousId) reqHeaders['X-Anonymous-Id'] = options.anonymousId;
                const res = await fetch(url, {
                  method: 'POST',
                  headers: reqHeaders,
                  body,
                  signal: ctrl.signal,
                });
                if (!res.ok || !res.body) {
                  if (res.status === 401) {
                    // Distinguish free-tier exhaustion from an expired session.
                    let code = 'sign_in_required';
                    try {
                      const errBody = (await res.json()) as { error?: string };
                      if (errBody?.error === 'word_limit_reached') code = 'word_limit_reached';
                    } catch {
                      // fall back to sign_in_required
                    }
                    fail(code);
                  } else {
                    fail(`HTTP ${res.status}`);
                  }
                  return;
                }
                connected = true;
                setState((prev) => ({ ...prev, isRetrying: false }));
                const reader = res.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buf = '';
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  let idx;
                  while ((idx = buf.indexOf('\n\n')) !== -1) {
                    const frame = buf.slice(0, idx);
                    buf = buf.slice(idx + 2);
                    parseSSEFrame(frame);
                  }
                }
                if (buf.trim()) parseSSEFrame(buf);
                // If the server closed without an explicit done event, finalize with what we have.
                if (myToken === tokenRef.current) {
                  finish({
                    ok: !!accText,
                    text: accText,
                    model: modelName,
                    error: accText ? null : 'no_data',
                    confidence: confidenceVal,
                    alternatives: alternativesVal,
                    usage: usageVal,
                  });
                }
              } catch (err: unknown) {
                if ((err as Error)?.name === 'AbortError') {
                  resolve({ ok: false, text: '', model: null, error: 'cancelled', confidence: 0, alternatives: [] });
                  return;
                }
                fail(err instanceof Error ? err.message : 'stream_failed');
              }
            })();
            return;
          }

          // Native: react-native-sse with POST + body
          try {
            const esHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
            };
            if (options?.authToken) esHeaders.Authorization = `Bearer ${options.authToken}`;
            if (options?.anonymousId) esHeaders['X-Anonymous-Id'] = options.anonymousId;
            const es: RNEventSource = new RNEventSource(url, {
              method: 'POST',
              headers: esHeaders,
              body,
              pollingInterval: 0,
            } as any);
            esRef.current = es;

            (es as any).addEventListener('open', () => {
              if (myToken !== tokenRef.current) return;
              connected = true;
              setState((prev) => ({ ...prev, isRetrying: false }));
            });
            (es as any).addEventListener('start', (e: any) => {
              try {
                const parsed = JSON.parse(e.data ?? '{}');
                if (parsed.model) onStart(parsed.model);
              } catch {}
            });
            (es as any).addEventListener('delta', (e: any) => {
              try {
                const parsed = JSON.parse(e.data ?? '{}');
                if (typeof parsed.text === 'string') onDelta(parsed.text);
              } catch {}
            });
            (es as any).addEventListener('confidence', (e: any) => {
              try {
                const parsed = JSON.parse(e.data ?? '{}');
                if (typeof parsed.confidence === 'number') onConfidence(parsed.confidence);
              } catch {}
            });
            (es as any).addEventListener('usage', (e: any) => {
              try {
                const parsed = JSON.parse(e.data ?? '{}');
                onUsage({
                  authed: parsed.authed === true,
                  wordsUsed: typeof parsed.wordsUsed === 'number' ? parsed.wordsUsed : 0,
                  wordLimit: typeof parsed.wordLimit === 'number' ? parsed.wordLimit : 0,
                });
              } catch {}
            });
            (es as any).addEventListener('done', (e: any) => {
              try {
                const parsed = JSON.parse(e.data ?? '{}');
                onDone(
                  parsed.text ?? '',
                  parsed.model ?? '',
                  typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
                  parseAlternatives(parsed.alternatives, parsed.text ?? '')
                );
              } catch {
                onDone(accText, modelName ?? '');
              }
              try { es.close(); } catch {}
            });
            es.addEventListener('error', (e: any) => {
              const msg = (e && (e.message || e.data)) || 'stream_error';
              fail(typeof msg === 'string' ? msg : 'stream_error');
              try { es.close(); } catch {}
            });
          } catch (err) {
            fail(err instanceof Error ? err.message : 'stream_failed');
          }
        };

        openStream();
      });
    },
    [cancel]
  );

  const reset = useCallback(() => {
    cancel();
    setState(initialState);
  }, [cancel]);

  return { ...state, start, cancel, reset };
}

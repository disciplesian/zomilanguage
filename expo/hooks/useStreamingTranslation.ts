import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
// @ts-ignore - no types shipped
import RNEventSource from 'react-native-sse';

type StreamState = {
  text: string;
  model: string | null;
  isStreaming: boolean;
  error: string | null;
  done: boolean;
};

export type StreamResult = { ok: boolean; text: string; model: string | null; error: string | null };

const initialState: StreamState = {
  text: '',
  model: null,
  isStreaming: false,
  error: null,
  done: false,
};

const getBaseUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (url && url.length > 0) return url.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'https://api.rork.app';
};

/**
 * Streams a translation token-by-token from the backend SSE endpoint.
 * - Web: fetch + ReadableStream parser (POST body required, so we don't use window.EventSource).
 * - Native: react-native-sse (supports POST with body).
 *
 * The endpoint is POST /api/translate/stream and emits SSE events:
 *   start { model }, delta { text }, done { text, model }, error { code, message }
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
    (text: string, targetLanguage: string): Promise<StreamResult> => {
      cancel();
      const myToken = ++tokenRef.current;
      setState({ ...initialState, isStreaming: true });

      const url = `${getBaseUrl()}/api/translate/stream`;
      const body = JSON.stringify({ text, targetLanguage });

      // Local accumulators (do not rely on async setState for resolution).
      let accText = '';
      let modelName: string | null = null;

      return new Promise<StreamResult>((resolve) => {
        const finish = (result: StreamResult) => {
          if (myToken !== tokenRef.current) return resolve({ ok: false, text: '', model: null, error: 'cancelled' });
          if (result.ok) {
            setState({ text: result.text, model: result.model, isStreaming: false, error: null, done: true });
          } else {
            setState({ text: accText, model: modelName, isStreaming: false, error: result.error, done: false });
          }
          resolve(result);
        };

        const onStart = (m: string) => {
          if (myToken !== tokenRef.current) return;
          modelName = m;
          setState((prev) => ({ ...prev, model: m }));
        };
        const onDelta = (piece: string) => {
          if (myToken !== tokenRef.current) return;
          accText += piece;
          setState((prev) => ({ ...prev, text: prev.text + piece }));
        };
        const onDone = (full: string, m: string) => {
          finish({ ok: true, text: full || accText, model: m || modelName, error: null });
        };
        const onError = (msg: string) => {
          finish({ ok: false, text: accText, model: modelName, error: msg });
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
            else if (event === 'done') onDone(parsed.text ?? '', parsed.model ?? '');
            else if (event === 'error') onError(parsed.message ?? parsed.code ?? 'stream_error');
          } catch {
            // ignore malformed frames
          }
        };

        if (Platform.OS === 'web') {
          const ctrl = new AbortController();
          abortRef.current = ctrl;
          (async () => {
            try {
              const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
                body,
                signal: ctrl.signal,
              });
              if (!res.ok || !res.body) {
                onError(`HTTP ${res.status}`);
                return;
              }
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
                finish({ ok: !!accText, text: accText, model: modelName, error: accText ? null : 'no_data' });
              }
            } catch (err: unknown) {
              if ((err as Error)?.name === 'AbortError') {
                resolve({ ok: false, text: '', model: null, error: 'cancelled' });
                return;
              }
              onError(err instanceof Error ? err.message : 'stream_failed');
            }
          })();
          return;
        }

        // Native: react-native-sse with POST + body
        try {
          const es: RNEventSource = new RNEventSource(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
            body,
            pollingInterval: 0,
          } as any);
          esRef.current = es;

          es.addEventListener('start', (e: any) => {
            try {
              const parsed = JSON.parse(e.data ?? '{}');
              if (parsed.model) onStart(parsed.model);
            } catch {}
          });
          es.addEventListener('delta', (e: any) => {
            try {
              const parsed = JSON.parse(e.data ?? '{}');
              if (typeof parsed.text === 'string') onDelta(parsed.text);
            } catch {}
          });
          es.addEventListener('done', (e: any) => {
            try {
              const parsed = JSON.parse(e.data ?? '{}');
              onDone(parsed.text ?? '', parsed.model ?? '');
            } catch {
              onDone(accText, modelName ?? '');
            }
            try { es.close(); } catch {}
          });
          es.addEventListener('error', (e: any) => {
            const msg = (e && (e.message || e.data)) || 'stream_error';
            onError(typeof msg === 'string' ? msg : 'stream_error');
            try { es.close(); } catch {}
          });
        } catch (err) {
          onError(err instanceof Error ? err.message : 'stream_failed');
        }
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

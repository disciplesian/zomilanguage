import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useRef, useState } from 'react';

const GLOSSARY_KEY = '@zomi_user_glossary_v1';
const MAX_TERMS = 200;

export interface GlossaryTerm {
  id: string;
  term: string;
  meaning: string;
  createdAt: number;
}

let storage: typeof import('@react-native-async-storage/async-storage').default | null = null;
const getStorage = async () => {
  if (storage) return storage;
  try {
    const m = await import('@react-native-async-storage/async-storage');
    storage = m.default;
    return storage;
  } catch {
    return null;
  }
};

export const [GlossaryProvider, useGlossary] = createContextHook(() => {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await getStorage();
      if (!s) {
        if (alive) setHydrated(true);
        return;
      }
      try {
        const raw = await s.getItem(GLOSSARY_KEY);
        if (!alive) return;
        if (raw) {
          const parsed = JSON.parse(raw) as GlossaryTerm[];
          if (Array.isArray(parsed)) setTerms(parsed.slice(0, MAX_TERMS));
        }
      } catch {}
      if (alive) setHydrated(true);
    })();
    return () => { alive = false; };
  }, []);

  const persist = useCallback((next: GlossaryTerm[]) => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(async () => {
      const s = await getStorage();
      if (s) {
        try { await s.setItem(GLOSSARY_KEY, JSON.stringify(next.slice(0, MAX_TERMS))); } catch {}
      }
    }, 200);
  }, []);

  const add = useCallback(
    (term: string, meaning: string) => {
      const t = term.trim();
      const m = meaning.trim();
      if (!t || !m) return;
      setTerms((prev) => {
        const filtered = prev.filter((x) => x.term.toLowerCase() !== t.toLowerCase());
        const entry: GlossaryTerm = {
          id: 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          term: t,
          meaning: m,
          createdAt: Date.now(),
        };
        const next = [entry, ...filtered].slice(0, MAX_TERMS);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const update = useCallback(
    (id: string, term: string, meaning: string) => {
      setTerms((prev) => {
        const next = prev.map((x) => (x.id === id ? { ...x, term: term.trim(), meaning: meaning.trim() } : x));
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const remove = useCallback(
    (id: string) => {
      setTerms((prev) => {
        const next = prev.filter((x) => x.id !== id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clear = useCallback(() => {
    setTerms([]);
    persist([]);
  }, [persist]);

  /** Import terms synced from another device: union-merge by term, newest edit wins. */
  const importTerms = useCallback(
    (remote: GlossaryTerm[]) => {
      if (!remote.length) return;
      setTerms((prev) => {
        const byTerm = new Map<string, GlossaryTerm>();
        for (const t of [...prev, ...remote]) {
          const key = t.term.trim().toLowerCase();
          const existing = byTerm.get(key);
          if (!existing || t.createdAt >= existing.createdAt) byTerm.set(key, t);
        }
        const next = [...byTerm.values()]
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, MAX_TERMS);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  /** Returns a plain object suitable for sending to the backend / fallback prompts. */
  const asRecord = useCallback((): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const t of terms) out[t.term] = t.meaning;
    return out;
  }, [terms]);

  return { terms, hydrated, add, update, remove, clear, importTerms, asRecord };
});

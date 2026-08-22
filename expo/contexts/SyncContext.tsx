import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useGlossary } from './GlossaryContext';
import { useTranslationCache } from './TranslationCacheContext';
import {
  pullSync,
  pushSync,
  mergeGlossaries,
  mergeTranslations,
} from '@/lib/cloudSync';

export type SyncStatus = 'idle' | 'syncing' | 'error';

/**
 * Cloud sync: keeps the personal glossary and saved translations consistent
 * across devices for signed-in users. On sign-in the remote state is pulled
 * and union-merged into local storage; afterwards local edits are pushed
 * (debounced). Local-first: everything works offline, sync is additive.
 */
export const [SyncProvider, useSync] = createContextHook(() => {
  const { user } = useAuth();
  const glossary = useGlossary();
  const cache = useTranslationCache();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const pulledForUser = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull remote data on sign-in, merge into local, then push the merged state.
  useEffect(() => {
    if (!user || !glossary.hydrated || !cache.hydrated) return;
    if (pulledForUser.current === user.id) return;
    pulledForUser.current = user.id;

    let alive = true;
    (async () => {
      setStatus('syncing');
      const remote = await pullSync();
      if (!alive) return;

      const mergedGlossary = mergeGlossaries(glossary.terms, remote?.glossary ?? []);
      const mergedTranslations = mergeTranslations(cache.entries, remote?.translations ?? []);

      glossary.importTerms(remote?.glossary ?? []);
      cache.importEntries(remote?.translations ?? []);

      const ok = await pushSync(mergedGlossary, mergedTranslations);
      if (!alive) return;
      if (ok) {
        setLastSyncedAt(Date.now());
        setStatus('idle');
      } else {
        setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, glossary.hydrated, cache.hydrated]);

  // Push local edits (debounced) while signed in.
  useEffect(() => {
    if (!user || !glossary.hydrated || !cache.hydrated) return;
    if (pulledForUser.current !== user.id) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      setStatus('syncing');
      const ok = await pushSync(glossary.terms, cache.entries);
      if (ok) {
        setLastSyncedAt(Date.now());
        setStatus('idle');
      } else {
        setStatus('error');
      }
    }, 4000);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, glossary.terms, cache.entries]);

  // Reset when the user signs out.
  useEffect(() => {
    if (!user) {
      pulledForUser.current = null;
      setLastSyncedAt(null);
      setStatus('idle');
    }
  }, [user]);

  return { status, lastSyncedAt };
});

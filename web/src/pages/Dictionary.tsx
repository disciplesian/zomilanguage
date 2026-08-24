import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';

import { SiteLayout, GlassCard } from '@/components/SiteLayout';
import { useAuth } from '@/lib/auth';
import { getAnonymousId } from '@/lib/anonymousId';
import {
  streamTranslation,
  WORD_LIMIT_ERROR,
  fetchLatestDictionary,
  fetchEntryExamples,
  type EntryExample,
} from '@/lib/portalApi';
import {
  CATEGORY_COLORS,
  activeDictionaryCount,
  activeDictionaryVersion,
  applyRemoteDataset,
  browseLetters,
  cacheDictionary,
  entriesForLetter,
  hasExactMatch,
  loadCachedDictionary,
  posLabel,
  relatedEntries,
  CATEGORY_DESCRIPTIONS,
  searchDictionary,
  suggestTerms,
  type DictionaryEntry,
} from '@/lib/dictionary';

type Direction = 'en-zo' | 'zo-en';

const AI_DEBOUNCE_MS = 700;

const OFFLINE_MESSAGE =
  'You appear to be offline. The verified dictionary still works — reconnect for AI answers.';

/** Dictionary — instant search over the 10,620 verified English ⇄ Zomi entries,
 *  with a Zomi AI fallback for words that are not in the verified dataset. */
export default function Dictionary() {
  const [query, setQuery] = useState<string>('');
  const [direction, setDirection] = useState<Direction>('en-zo');
  const [isAskingAI, setIsAskingAI] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string>('A');
  /** Bumped when an over-the-air dataset update is applied, so the search and
   *  browse memos recompute against the refreshed dictionary. */
  const [datasetVersion, setDatasetVersion] = useState<number>(() => activeDictionaryVersion());

  // Expanded entry detail view.
  const [detail, setDetail] = useState<DictionaryEntry | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [detailExamples, setDetailExamples] = useState<EntryExample[]>([]);
  const [examplesPhase, setExamplesPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  /** Example sentences cached per English headword for this session. */
  const examplesCache = useRef(new Map<string, EntryExample[]>());

  const { user, getAccessToken } = useAuth();
  const abortRef = useRef<AbortController | null>(null);
  const queryRef = useRef<string>(query);
  queryRef.current = query;

  const trimmed = query.trim();
  const results = useMemo(() => searchDictionary(query, 60), [query, datasetVersion]);
  // Real-time completions for the search bar (works fully offline).
  const suggestions = useMemo(() => suggestTerms(query, 8), [query, datasetVersion]);
  const needsAI = trimmed.length >= 2 && results.length === 0 && !hasExactMatch(trimmed);

  // Offline browsing: with no query, list entries alphabetically by letter.
  const isBrowsing = trimmed.length === 0;
  const letters = useMemo(() => browseLetters(), [datasetVersion]);
  const browseData = useMemo(
    () => (isBrowsing ? entriesForLetter(selectedLetter) : []),
    [isBrowsing, selectedLetter, datasetVersion]
  );

  // Over-the-air dataset update: apply the cached copy first (works offline),
  // then check /api/dictionary/latest for a newer published version.
  useEffect(() => {
    loadCachedDictionary();
    setDatasetVersion(activeDictionaryVersion());
    let cancelled = false;
    void refreshDictionary(false).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Immediate OTA dictionary update check. Used at startup and via pull/refresh. */
  async function refreshDictionary(showSpinner = true): Promise<void> {
    if (showSpinner) setRefreshing(true);
    try {
      const latest = await fetchLatestDictionary();
      if (latest && applyRemoteDataset(latest.version, latest.entries)) {
        cacheDictionary();
        setDatasetVersion(activeDictionaryVersion());
      }
    } catch {
      // Offline or backend unreachable — the bundled/cached dictionary still works.
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }

  // Debounced AI fallback when the word is not in the verified dictionary.
  useEffect(() => {
    setAiResult(null);
    setAiError(null);
    setIsAskingAI(false);
    abortRef.current?.abort();

    if (trimmed.length < 2 || !needsAI) return;

    const timer = setTimeout(async () => {
      const current = queryRef.current.trim();
      if (current !== trimmed || current.length < 2) return;
      if (!navigator.onLine) {
        setAiError(OFFLINE_MESSAGE);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsAskingAI(true);
      try {
        const token = user ? await getAccessToken() : null;
        const result = await streamTranslation(
          {
            text: current,
            sourceLanguage: direction === 'en-zo' ? 'english' : 'zomi',
            targetLanguage: direction === 'en-zo' ? 'zomi' : 'english',
            token,
            anonymousId: getAnonymousId(),
          },
          () => {},
          controller.signal
        );
        if (queryRef.current.trim() !== current) return;
        const answer = result.text.trim();
        if (answer) {
          setAiResult(answer);
        } else {
          setAiError('AI lookup returned no result. Please try again.');
        }
      } catch (err) {
        if (controller.signal.aborted || queryRef.current.trim() !== current) return;
        if (err instanceof Error && err.message === WORD_LIMIT_ERROR) {
          setAiError('You have used your 1,500 free words. Sign in to keep going — it is free.');
        } else if (!navigator.onLine) {
          setAiError(OFFLINE_MESSAGE);
        } else {
          setAiError('AI lookup is unavailable right now. Check your connection and try again.');
        }
      } finally {
        if (queryRef.current.trim() === current) setIsAskingAI(false);
      }
    }, AI_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, needsAI, direction]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    } catch (err) {
      console.error('Clipboard error:', err);
    }
  }, []);

  const copyIcon = (text: string) =>
    copied === text ? (
      <Check className="h-4 w-4 text-[#00ff88]" />
    ) : (
      <Copy className="h-4 w-4 text-white/40" />
    );

  // Related terms for the open entry (local, offline-safe).
  const detailRelated = useMemo(
    () => (detail ? relatedEntries(detail) : []),
    [detail, datasetVersion]
  );

  // Example sentences for the open entry: session cache first, then the AI
  // endpoint (offline-tolerant — the rest of the detail view works without it).
  useEffect(() => {
    if (!detail) return;
    const key = detail.english.toLowerCase();
    const cached = examplesCache.current.get(key);
    if (cached) {
      setDetailExamples(cached);
      setExamplesPhase('ready');
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setDetailExamples([]);
    setExamplesPhase('loading');
    void (async () => {
      try {
        const token = user ? await getAccessToken() : null;
        const result = await fetchEntryExamples(
          { english: detail.english, zomi: detail.zomi, pos: detail.pos },
          { token, anonymousId: getAnonymousId(), signal: controller.signal }
        );
        if (cancelled) return;
        if (result.length > 0) {
          examplesCache.current.set(key, result);
          setDetailExamples(result);
          setExamplesPhase('ready');
        } else {
          setExamplesPhase('error');
        }
      } catch {
        if (!cancelled) setExamplesPhase('error');
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [detail, user, getAccessToken]);

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-3xl px-5 py-10">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 shadow-[0_0_24px_rgba(0,240,255,0.15)]">
            <BookOpen className="h-5 w-5 text-[#00f0ff]" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Zomi Dictionary</h1>
            <p className="text-sm text-white/60">
              {activeDictionaryCount().toLocaleString()} verified entries · English ⇄ Zomi
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#ffb84d]/35 bg-[#ffb84d]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#ffb84d]">
            <WifiOff className="h-3 w-3" /> Offline ready
          </span>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void refreshDictionary()}
            aria-label="Check for dictionary updates"
            className="ml-2 inline-flex items-center rounded-full border border-white/15 bg-white/5 p-2 text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-6">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md focus-within:border-[#00f0ff]/40">
            <Search className="h-5 w-5 shrink-0 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search English or Zomi..."
              className="w-full bg-transparent text-base text-white placeholder:text-white/35 focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="shrink-0 rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Real-time suggestions */}
          {suggestions.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#1b2036]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
              {suggestions.map((s) => (
                <button
                  key={`${s.lang}-${s.text}`}
                  type="button"
                  onClick={() => setQuery(s.text)}
                  aria-label={`Search for ${s.text}`}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition hover:bg-white/[0.06]"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
                  <span className="truncate text-sm font-semibold text-white">{s.text}</span>
                  <span className="ml-auto max-w-[45%] truncate text-xs text-[#80f7ff]">
                    {s.hint}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Direction toggle */}
        <div className="mt-4 flex gap-2">
          {(
            [
              ['en-zo', 'English → Zomi'],
              ['zo-en', 'Zomi → English'],
            ] as const
          ).map(([dir, label]) => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                direction === dir
                  ? 'border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff]'
                  : 'border-white/10 bg-white/5 text-white/60 hover:text-white/85'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Browse letter index (offline) */}
        {isBrowsing && (
          <div className="mt-5">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {letters.map((letter) => (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(letter)}
                  aria-label={`Browse entries under ${letter}`}
                  className={`h-9 w-9 shrink-0 rounded-xl border text-sm font-bold transition ${
                    selectedLetter === letter
                      ? 'border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff]'
                      : 'border-white/10 bg-white/5 text-white/60 hover:text-white/85'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/40">
              {browseData.length.toLocaleString()} {browseData.length === 1 ? 'entry' : 'entries'}{' '}
              under &ldquo;{selectedLetter}&rdquo;
            </p>
          </div>
        )}

        {/* Match count */}
        {trimmed && results.length > 0 && (
          <p className="mt-5 text-xs text-white/40">
            {results.length === 60 ? '60+' : results.length} verified{' '}
            {results.length === 1 ? 'match' : 'matches'} for &ldquo;{trimmed}&rdquo;
          </p>
        )}

        {/* Results / browse list */}
        {(trimmed ? results : browseData).length > 0 && (
          <div className="mt-4 flex flex-col gap-2.5">
            {(trimmed ? results : browseData).map((entry, i) => (
              <ResultRow
                key={`${selectedLetter}-${i}-${entry.english}-${entry.pos}-${entry.zomi}`}
                entry={entry}
                onOpen={setDetail}
                onCopy={copy}
                copyIcon={copyIcon(entry.zomi)}
              />
            ))}
          </div>
        )}

        {/* AI fallback */}
        {(needsAI || isAskingAI || aiResult || aiError) && (
          <GlassCard className="mt-4 !border-[#ffd000]/25 !bg-[#ffd000]/[0.04]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#ffd000]" />
              <p className="text-sm font-semibold text-white/70">
                No verified entry for &ldquo;{trimmed}&rdquo;
              </p>
            </div>
            {isAskingAI ? (
              <div className="mt-4 flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-[#ffd000]" />
                <span className="text-sm text-white/60">Asking Zomi AI...</span>
              </div>
            ) : aiResult ? (
              <div className="mt-4">
                <p className="text-lg font-semibold leading-relaxed text-white">{aiResult}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffd000]/35 bg-[#ffd000]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#ffd000]">
                    <Sparkles className="h-3 w-3" /> Zomi AI
                  </span>
                  <button
                    onClick={() => copy(aiResult)}
                    aria-label="Copy AI result"
                    className="rounded-full bg-white/5 p-2 transition hover:bg-white/10"
                  >
                    {copyIcon(aiResult)}
                  </button>
                </div>
              </div>
            ) : aiError ? (
              <p className="mt-4 text-sm text-white/60">{aiError}</p>
            ) : null}
          </GlassCard>
        )}

        {/* Expanded entry detail: definition, grammatical category, AI example
            sentences and related terms from the verified dataset. */}
        {detail && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
            onClick={() => setDetail(null)}
          >
            <div
              role="dialog"
              aria-label={`Details for ${detail.english}`}
              className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/15 bg-[#131722] p-6 shadow-2xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-white">{detail.english}</h2>
                <button
                  onClick={() => setDetail(null)}
                  aria-label="Close details"
                  className="shrink-0 rounded-full p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    color: CATEGORY_COLORS[detail.category] ?? '#9BA3AF',
                    borderColor: `${CATEGORY_COLORS[detail.category] ?? '#9BA3AF'}55`,
                    backgroundColor: `${CATEGORY_COLORS[detail.category] ?? '#9BA3AF'}22`,
                  }}
                >
                  {posLabel(detail)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#00ff88]/35 bg-[#00ff88]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00ff88]">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              </div>

              <p className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-widest text-white/35">
                Definition
              </p>
              <div className="flex items-center gap-3">
                <p className="flex-1 text-xl font-semibold leading-relaxed text-[#80f7ff]">
                  {detail.zomi}
                </p>
                <button
                  onClick={() => copy(detail.zomi)}
                  aria-label="Copy definition"
                  className="shrink-0 rounded-full bg-white/5 p-2 transition hover:bg-white/10"
                >
                  {copyIcon(detail.zomi)}
                </button>
              </div>

              <p className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-widest text-white/35">
                Grammatical category
              </p>
              <p className="text-[15px] font-semibold capitalize text-white">{detail.category}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">
                {CATEGORY_DESCRIPTIONS[detail.category] ??
                  'A word that does not fit the standard grammatical categories.'}
              </p>

              <p className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-widest text-white/35">
                Example sentences
              </p>
              {examplesPhase === 'loading' ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-[#ffd000]" />
                  <span className="text-sm text-white/60">Asking Zomi AI...</span>
                </div>
              ) : examplesPhase === 'error' ? (
                <p className="text-sm leading-relaxed text-white/60">
                  Examples need an internet connection — the dictionary itself works offline.
                </p>
              ) : (
                <div>
                  {detailExamples.map((example, i) => (
                    <button
                      key={`${example.english}-${i}`}
                      onClick={() => copy(example.zomi)}
                      aria-label={`Copy Zomi example: ${example.zomi}`}
                      className="mb-2.5 block w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07]"
                    >
                      <p className="text-sm text-white">{example.english}</p>
                      <p className="mt-1 text-sm text-[#80f7ff]">{example.zomi}</p>
                    </button>
                  ))}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffd000]/35 bg-[#ffd000]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#ffd000]">
                    <Sparkles className="h-3 w-3" /> Zomi AI
                  </span>
                </div>
              )}

              {detailRelated.length > 0 && (
                <>
                  <p className="mt-5 mb-1 text-[11px] font-bold uppercase tracking-widest text-white/35">
                    Related terms
                  </p>
                  <div className="flex flex-col">
                    {detailRelated.map((related) => (
                      <button
                        key={`${related.english}-${related.pos}`}
                        onClick={() => setDetail(related)}
                        aria-label={`Open details for ${related.english}`}
                        className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-left transition hover:bg-white/5"
                      >
                        <span className="shrink-0 text-sm font-semibold text-white">
                          {related.english}
                        </span>
                        <span className="text-white/30">→</span>
                        <span className="truncate text-sm text-[#80f7ff]">{related.zomi}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </SiteLayout>
  );
}

function ResultRow({
  entry,
  onOpen,
  onCopy,
  copyIcon,
}: {
  entry: DictionaryEntry;
  onOpen: (entry: DictionaryEntry) => void;
  onCopy: (text: string) => void;
  copyIcon: React.ReactNode;
}) {
  const color = CATEGORY_COLORS[entry.category] ?? '#9BA3AF';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(entry);
        }
      }}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08]"
      aria-label={`${entry.english}, ${entry.pos}, ${entry.zomi}. Verified. Open details.`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold text-white">{entry.english}</span>
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ color, borderColor: `${color}55`, backgroundColor: `${color}22` }}
          >
            {posLabel(entry)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#00ff88]/35 bg-[#00ff88]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00ff88]">
            <BadgeCheck className="h-3 w-3" /> Verified
          </span>
        </div>
        <p className="mt-1.5 text-[15px] leading-relaxed text-[#80f7ff]">{entry.zomi}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCopy(entry.zomi);
        }}
        aria-label={`Copy ${entry.zomi}`}
        className="shrink-0 rounded-full p-2 transition hover:bg-white/10"
      >
        {copyIcon}
      </button>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  Check,
  Copy,
  Loader2,
  Search,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';

import { SiteLayout, GlassCard } from '@/components/SiteLayout';
import { useAuth } from '@/lib/auth';
import { getAnonymousId } from '@/lib/anonymousId';
import { streamTranslation, WORD_LIMIT_ERROR } from '@/lib/portalApi';
import {
  CATEGORY_COLORS,
  DICTIONARY_COUNT,
  browseLetters,
  entriesForLetter,
  hasExactMatch,
  posLabel,
  searchDictionary,
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

  const { user, getAccessToken } = useAuth();
  const abortRef = useRef<AbortController | null>(null);
  const queryRef = useRef<string>(query);
  queryRef.current = query;

  const trimmed = query.trim();
  const results = useMemo(() => searchDictionary(query, 60), [query]);
  const needsAI = trimmed.length >= 2 && results.length === 0 && !hasExactMatch(trimmed);

  // Offline browsing: with no query, list entries alphabetically by letter.
  const isBrowsing = trimmed.length === 0;
  const letters = useMemo(() => browseLetters(), []);
  const browseData = useMemo(
    () => (isBrowsing ? entriesForLetter(selectedLetter) : []),
    [isBrowsing, selectedLetter]
  );

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
              {DICTIONARY_COUNT.toLocaleString()} verified entries · English ⇄ Zomi
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#ffb84d]/35 bg-[#ffb84d]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#ffb84d]">
            <WifiOff className="h-3 w-3" /> Offline ready
          </span>
        </div>

        {/* Search */}
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md focus-within:border-[#00f0ff]/40">
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

      </div>
    </SiteLayout>
  );
}

function ResultRow({
  entry,
  onCopy,
  copyIcon,
}: {
  entry: DictionaryEntry;
  onCopy: (text: string) => void;
  copyIcon: React.ReactNode;
}) {
  const color = CATEGORY_COLORS[entry.category];
  return (
    <button
      onClick={() => onCopy(entry.zomi)}
      className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08]"
      aria-label={`${entry.english}, ${entry.pos}, ${entry.zomi}. Verified. Click to copy.`}
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
      <span className="shrink-0 p-2 transition group-hover:bg-white/10 rounded-full">{copyIcon}</span>
    </button>
  );
}

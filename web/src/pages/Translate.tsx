import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Copy,
  Check,
  ChevronDown,
  Loader2,
  Trash2,
  AlertCircle,
  Search,
  Sparkles,
  Volume2,
  BadgeCheck,
  X,
} from 'lucide-react';

import { SiteLayout, GlassCard } from '@/components/SiteLayout';
import { SignInPanel } from '@/components/SignInPanel';
import { useAuth } from '@/lib/auth';
import { getAnonymousId } from '@/lib/anonymousId';
import {
  ALL_LANGUAGES,
  PRIMARY_LANGUAGES,
  isPrimaryLanguage,
  languageLabel,
  languageTtsCode,
  type LanguageOption,
} from '@/lib/languages';
import { streamTranslation, WORD_LIMIT_ERROR, type UsageInfo } from '@/lib/portalApi';

const SUGGESTIONS = [
  'Na dam maw?',
  'Ka lungdam hi',
  'Nang min bang ahi?',
  'Pasian in hong thupha hen',
];

const MAX_CHARS = 5000;

const Translate = () => {
  const { user, isLoading, getAccessToken } = useAuth();
  const [sourceLanguage, setSourceLanguage] = useState<'zomi' | 'english'>('zomi');
  const [targetLanguage, setTargetLanguage] = useState<string>('english');
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState<boolean>(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const sourceLabel = sourceLanguage === 'zomi' ? 'Zomi' : 'English';
  const targetLabel = languageLabel(targetLanguage);

  const runTranslation = useCallback(async (): Promise<void> => {
    const text = input.trim();
    if (!text) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsTranslating(true);
    setError(null);
    setNeedsSignIn(false);
    setOutput('');
    setConfidence(0);
    setAlternatives([]);
    setIsConnecting(false);

    try {
      // Signed-in members translate without limits; guests draw down their
      // 1,500-word free allowance tracked by a stable anonymous ID.
      const token = user ? await getAccessToken() : null;
      const result = await streamTranslation(
        {
          text,
          sourceLanguage,
          targetLanguage,
          token,
          anonymousId: getAnonymousId(),
        },
        (chunk) => {
          setIsConnecting(false);
          setOutput((prev) => prev + chunk);
        },
        controller.signal,
        // Fires when a transient network blip triggers an automatic retry.
        () => setIsConnecting(true)
      );
      setOutput(result.text);
      setConfidence(result.confidence);
      setAlternatives(result.alternatives);
      if (result.usage) setUsage(result.usage);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof Error && err.message === WORD_LIMIT_ERROR) {
        setError('You have used your 1,500 free words. Sign in below to keep translating — it is free.');
        setNeedsSignIn(true);
      } else {
        setError(err instanceof Error ? err.message : 'Translation failed. Please try again.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsTranslating(false);
        setIsConnecting(false);
      }
    }
  }, [input, sourceLanguage, targetLanguage, getAccessToken, user]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const swap = useCallback((): void => {
    // With a primary target the direction fully reverses; with a custom
    // target only the source alternates (previous output was in the target
    // language, so it cannot become the new input).
    if (isPrimaryLanguage(targetLanguage)) {
      const reversed = targetLanguage === 'zomi' ? 'english' : 'zomi';
      setSourceLanguage(reversed as 'zomi' | 'english');
      setTargetLanguage(sourceLanguage);
      setInput(output);
      setOutput(input);
    } else {
      setSourceLanguage((prev) => (prev === 'zomi' ? 'english' : 'zomi'));
      setOutput('');
      setConfidence(0);
      setAlternatives([]);
    }
    setError(null);
  }, [sourceLanguage, targetLanguage, input, output]);

  const filteredLanguages = useMemo((): LanguageOption[] => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return ALL_LANGUAGES;
    return ALL_LANGUAGES.filter(
      (l) => l.label.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.includes(q)
    );
  }, [pickerSearch]);

  const selectLanguage = useCallback((code: string): void => {
    if (code === sourceLanguage) {
      // Keep source and target distinct by flipping the source.
      setSourceLanguage(sourceLanguage === 'zomi' ? 'english' : 'zomi');
    }
    setTargetLanguage(code);
    setPickerOpen(false);
    setPickerSearch('');
    setOutput('');
    setConfidence(0);
    setAlternatives([]);
    setError(null);
  }, [sourceLanguage]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handlePointerDown = (e: MouseEvent): void => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setPickerSearch('');
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [pickerOpen]);

  const clearAll = useCallback((): void => {
    abortRef.current?.abort();
    setInput('');
    setOutput('');
    setConfidence(0);
    setAlternatives([]);
    setError(null);
    setIsTranslating(false);
    setIsConnecting(false);
  }, []);

  const swapAlternatives = useCallback((index: number): void => {
    // Promote the tapped alternative to the main translation.
    const chosen = alternatives[index];
    if (!chosen) return;
    const previous = output;
    setOutput(chosen);
    setAlternatives(alternatives.map((a, i) => (i === index ? previous : a)));
  }, [alternatives, output]);

  const copyOutput = useCallback(async (): Promise<void> => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not copy to the clipboard.');
    }
  }, [output]);

  const speak = useCallback((): void => {
    if (!output || typeof window.speechSynthesis === 'undefined') return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(output);
    utterance.lang = languageTtsCode(targetLanguage);
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  }, [output, targetLanguage]);

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#00f0ff]" />
        </div>
      </SiteLayout>
    );
  }

  const freeWordsLeft = usage && !usage.authed && usage.wordLimit > 0
    ? Math.max(0, usage.wordLimit - usage.wordsUsed)
    : null;

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-4xl px-5 pb-20 pt-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Translator</h1>
            <p className="mt-1.5 text-sm text-white/50">
              {user
                ? `Signed in as ${user.name ?? user.email}`
                : 'Free for your first 1,500 words — no account needed'}
            </p>
          </div>
          {!user && (
            <div className="flex flex-col items-end gap-1.5">
              {freeWordsLeft !== null ? (
                <span className="rounded-full border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-3 py-1 text-xs font-semibold text-[#7de9ff]">
                  {freeWordsLeft.toLocaleString()} of 1,500 free words left
                </span>
              ) : (
                <span className="text-xs text-white/40">1,500 free words without an account</span>
              )}
              <span className="text-xs text-white/35">Sign in anytime for unlimited translation</span>
            </div>
          )}
          <div ref={pickerRef} className="relative">
            <div className="flex items-center gap-2 rounded-xl border border-white/15 p-1.5">
              <button
                type="button"
                onClick={() => setSourceLanguage(sourceLanguage === 'zomi' ? 'english' : 'zomi')}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5 hover:text-[#00f0ff]"
              >
                {sourceLabel}
              </button>
              <button
                type="button"
                onClick={swap}
                aria-label="Swap languages"
                className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/5 hover:text-[#00f0ff]"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen((prev) => !prev)}
                aria-expanded={pickerOpen}
                aria-haspopup="listbox"
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5 hover:text-[#00f0ff]"
              >
                {targetLabel}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${pickerOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {pickerOpen && (
              <div
                role="listbox"
                className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-white/15 bg-[#161a2b] shadow-2xl shadow-black/50"
              >
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <Search className="h-4 w-4 shrink-0 text-white/35" />
                  <input
                    autoFocus
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search languages…"
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                  />
                  {pickerSearch && (
                    <button
                      type="button"
                      onClick={() => setPickerSearch('')}
                      aria-label="Clear search"
                      className="text-white/35 transition-colors hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto py-1.5">
                  {!pickerSearch.trim() && (
                    <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
                      Popular
                    </p>
                  )}
                  {(pickerSearch.trim() ? filteredLanguages : PRIMARY_LANGUAGES).map((l) => (
                    <LanguageRow
                      key={l.code}
                      language={l}
                      selected={l.code === targetLanguage}
                      onSelect={() => selectLanguage(l.code)}
                    />
                  ))}
                  {!pickerSearch.trim() && (
                    <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/35">
                      All languages
                    </p>
                  )}
                  {pickerSearch.trim()
                    ? null
                    : filteredLanguages
                        .filter((l) => !PRIMARY_LANGUAGES.some((p) => p.code === l.code))
                        .map((l) => (
                          <LanguageRow
                            key={l.code}
                            language={l}
                            selected={l.code === targetLanguage}
                            onSelect={() => selectLanguage(l.code)}
                          />
                        ))}
                  {filteredLanguages.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-white/35">No languages found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Input */}
          <GlassCard className="flex flex-col p-0">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {sourceLabel}
              </span>
              <span className="text-xs text-white/35">
                {input.length}/{MAX_CHARS}
              </span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
              placeholder={`Type or paste ${sourceLabel} text…`}
              rows={8}
              className="w-full flex-1 resize-none bg-transparent px-5 py-4 text-[17px] leading-relaxed text-white placeholder:text-white/30 focus:outline-none"
            />
            <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3">
              <button
                type="button"
                onClick={() => void runTranslation()}
                disabled={isTranslating || input.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00f0ff] px-4 py-2.5 text-sm font-semibold text-[#10131f] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isTranslating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Translate
              </button>
              {(input || output) && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </GlassCard>

          {/* Output */}
          <GlassCard className="flex flex-col p-0">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#00f0ff]">
                {targetLabel}
                {output && !isTranslating && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#1d9bf0]/40 bg-[#1d9bf0]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#63c0ff]">
                    <BadgeCheck className="h-3 w-3" />
                    Official
                  </span>
                )}
              </span>
              {confidence > 0 && (
                <span className="rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7dffc0]">
                  {confidence}% confidence
                </span>
              )}
            </div>
            <div className="min-h-[13rem] flex-1 px-5 py-4">
              {output ? (
                <>
                  <p className="whitespace-pre-wrap text-[17px] leading-relaxed text-white/95">
                    {output}
                    {isTranslating && (
                      <span className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse bg-[#00f0ff] align-middle" />
                    )}
                  </p>
                  {alternatives.length > 0 && !isTranslating && (
                    <div className="mt-4 border-t border-white/10 pt-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                        Also common
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {alternatives.map((alt, i) => (
                          <button
                            key={`${alt}-${i}`}
                            type="button"
                            onClick={() => swapAlternatives(i)}
                            title="Use this phrasing"
                            className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/70 transition-colors hover:border-[#00f0ff]/40 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff]"
                          >
                            {alt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : isTranslating ? (
                <div className="flex items-center gap-2 text-white/40">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isConnecting ? 'Connecting…' : 'Translating…'}
                </div>
              ) : (
                <p className="text-[17px] text-white/25">Your translation will appear here.</p>
              )}
            </div>
            {output && !isTranslating && (
              <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3">
                <button
                  type="button"
                  onClick={() => void copyOutput()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/35 hover:text-white"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[#00ff88]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={speak}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/35 hover:text-white"
                >
                  <Volume2 className="h-4 w-4" />
                  Listen
                </button>
              </div>
            )}
          </GlassCard>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#ff5e5e]/30 bg-[#ff5e5e]/10 p-4">
            <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#ff8a8a]" />
            <p className="text-sm text-[#ffb3b3]">{error}</p>
          </div>
        )}

        {needsSignIn && !user && (
          <div className="mt-6">
            <SignInPanel
              title="Keep translating"
              message="You have used your 1,500 free words. Sign in with Google or Apple for unlimited translation — it is free and your history syncs across devices."
            />
          </div>
        )}

        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Try a phrase
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => {
                  setSourceLanguage('zomi');
                  setTargetLanguage('english');
                  setInput(phrase);
                }}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 transition-colors hover:border-[#00f0ff]/40 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff]"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
};

const LanguageRow = ({
  language,
  selected,
  onSelect,
}: {
  language: LanguageOption;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    role="option"
    aria-selected={selected}
    onClick={onSelect}
    className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-white/5 ${
      selected ? 'bg-[#00f0ff]/10' : ''
    }`}
  >
    <span>
      <span
        className={`block text-sm font-semibold ${selected ? 'text-[#00f0ff]' : 'text-white/85'}`}
      >
        {language.label}
      </span>
      <span className="block text-xs text-white/35">{language.native}</span>
    </span>
    {selected && <Check className="h-4 w-4 shrink-0 text-[#00f0ff]" />}
  </button>
);

export default Translate;

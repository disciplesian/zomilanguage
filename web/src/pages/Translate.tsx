import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Copy,
  Check,
  Loader2,
  Trash2,
  AlertCircle,
  Sparkles,
  Volume2,
  BadgeCheck,
} from 'lucide-react';

import { SiteLayout, GlassCard } from '@/components/SiteLayout';
import { SignInPanel } from '@/components/SignInPanel';
import { useAuth } from '@/lib/auth';
import { streamTranslation } from '@/lib/portalApi';

const SUGGESTIONS = [
  'Na dam maw?',
  'Ka lungdam hi',
  'Nang min bang ahi?',
  'Pasian in hong thupha hen',
];

const MAX_CHARS = 5000;

const Translate = () => {
  const { user, isLoading, getAccessToken } = useAuth();
  const [zomiToEnglish, setZomiToEnglish] = useState<boolean>(true);
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);

  const sourceLabel = zomiToEnglish ? 'Zomi' : 'English';
  const targetLabel = zomiToEnglish ? 'English' : 'Zomi';

  const runTranslation = useCallback(async (): Promise<void> => {
    const text = input.trim();
    if (!text) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsTranslating(true);
    setError(null);
    setOutput('');
    setConfidence(0);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Your session expired. Please sign in again.');
        return;
      }
      const result = await streamTranslation(
        token,
        { text, targetLanguage: zomiToEnglish ? 'english' : 'zomi' },
        (chunk) => setOutput((prev) => prev + chunk),
        controller.signal
      );
      setOutput(result.text);
      setConfidence(result.confidence);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Translation failed. Please try again.');
    } finally {
      if (!controller.signal.aborted) setIsTranslating(false);
    }
  }, [input, zomiToEnglish, getAccessToken]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const swap = useCallback((): void => {
    setZomiToEnglish((prev) => !prev);
    setInput(output);
    setOutput(input);
    setError(null);
  }, [input, output]);

  const clearAll = useCallback((): void => {
    abortRef.current?.abort();
    setInput('');
    setOutput('');
    setConfidence(0);
    setError(null);
    setIsTranslating(false);
  }, []);

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
    utterance.lang = zomiToEnglish ? 'en-US' : 'en-US';
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  }, [output, zomiToEnglish]);

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#00f0ff]" />
        </div>
      </SiteLayout>
    );
  }

  if (!user) {
    return (
      <SiteLayout>
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <SignInPanel />
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-4xl px-5 pb-20 pt-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Translator</h1>
            <p className="mt-1.5 text-sm text-white/50">
              Signed in as {user.name ?? user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={swap}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-[#00f0ff]/50 hover:text-[#00f0ff]"
          >
            <ArrowLeftRight className="h-4 w-4" />
            {sourceLabel} → {targetLabel}
          </button>
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
                <p className="whitespace-pre-wrap text-[17px] leading-relaxed text-white/95">
                  {output}
                  {isTranslating && (
                    <span className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse bg-[#00f0ff] align-middle" />
                  )}
                </p>
              ) : isTranslating ? (
                <div className="flex items-center gap-2 text-white/40">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Translating…
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
                  setZomiToEnglish(true);
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

export default Translate;

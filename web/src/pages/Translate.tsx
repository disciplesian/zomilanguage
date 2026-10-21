import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  BadgeCheck,
  Check,
  ClipboardPaste,
  Copy,
  Image as ImageIcon,
  Loader2,
  Share2,
  Sparkles,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { SiteLayout, GlassCard } from '@/components/SiteLayout';
import { useAuth } from '@/lib/auth';
import { getAnonymousId } from '@/lib/anonymousId';
import { instantTranslation } from '@/lib/dictionary';
import { history } from '@/lib/history';
import { streamTranslation, WORD_LIMIT_ERROR } from '@/lib/portalApi';
import { useOnline } from '@/hooks/use-online';
import { shareTranslationImage } from '@/lib/shareImage';
import { useUiLanguage } from '@/lib/i18n';

const GUEST_MAX_CHARS = 500;
const MEMBER_MAX_CHARS = 5000;
const CONSENT_KEY = 'zomi_ai_consent_v1';

/** Copies text with a temporary textarea; works where the async Clipboard API is blocked. */
function legacyCopy(text: string): boolean {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
const BANNER_KEY = 'zomi_get_app_dismissed';

type Lang = 'zomi' | 'english';

const Translate = () => {
  const { user, getAccessToken } = useAuth();
  const online = useOnline();
  const [source, setSource] = useState<Lang>('zomi');
  const [copied, setCopied] = useState<boolean>(false);
  const target: Lang = source === 'zomi' ? 'english' : 'zomi';
  const { t } = useUiLanguage();
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLimit, setIsLimit] = useState<boolean>(false);
  const [freeLeft, setFreeLeft] = useState<number | null>(null);
  const [consent, setConsent] = useState<boolean>(() => localStorage.getItem(CONSENT_KEY) === '1');
  // Read by runTranslation so agreeing takes effect immediately (state updates land a render later).
  const consentRef = useRef<boolean>(consent);
  const [showBanner, setShowBanner] = useState<boolean>(() => localStorage.getItem(BANNER_KEY) !== '1');
  const [turns, setTurns] = useState<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const historyRef = useRef<number | null>(null);
  const lastKeyRef = useRef<string>('');

  const sourceLabel = source === 'zomi' ? 'Zomi' : t('English');
  const targetLabel = target === 'zomi' ? 'Zomi' : t('English');
  const maxChars = user ? MEMBER_MAX_CHARS : GUEST_MAX_CHARS;

  const resetOutput = useCallback((): void => {
    setOutput('');
    setAlternatives([]);
    setIsVerified(false);
    setError(null);
    setIsLimit(false);
    setIsTranslating(false);
    setIsConnecting(false);
  }, []);

  const showInstant = useCallback(
    (text: string, from: Lang): boolean => {
      const hit = instantTranslation(text, from === 'zomi');
      if (!hit) return false;
      abortRef.current?.abort();
      lastKeyRef.current = `${from}|${text}`;
      setOutput(hit.text);
      setAlternatives(hit.alternatives);
      setIsVerified(true);
      setError(null);
      setIsLimit(false);
      setIsTranslating(false);
      if (historyRef.current) window.clearTimeout(historyRef.current);
      historyRef.current = window.setTimeout(() => {
        history.save({
          sourceText: text,
          translatedText: hit.text,
          sourceLanguage: from,
          targetLanguage: from === 'zomi' ? 'english' : 'zomi',
        });
      }, 1200);
      return true;
    },
    []
  );

  const runTranslation = useCallback(
    async (text: string, from: Lang, force = false): Promise<void> => {
      if (!text) return;
      if (showInstant(text, from)) return;
      if (!consentRef.current) {
        setError('Please review the AI notice above to translate sentences.');
        return;
      }
      const key = `${from}|${text}`;
      if (!force && key === lastKeyRef.current) return;
      lastKeyRef.current = key;
      const to: Lang = from === 'zomi' ? 'english' : 'zomi';

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const cached = history.lookup(text, to);
      setOutput(cached?.translatedText ?? '');
      setAlternatives([]);
      setIsVerified(false);
      setError(null);
      setIsLimit(false);
      setIsTranslating(!cached);
      setIsConnecting(false);

      try {
        const token = user ? await getAccessToken() : null;
        let streamed = '';
        const result = await streamTranslation(
          { text, sourceLanguage: from, targetLanguage: to, token, anonymousId: getAnonymousId() },
          (chunk) => {
            streamed += chunk;
            setIsConnecting(false);
            setIsTranslating(false);
            setOutput(streamed);
          },
          controller.signal,
          () => setIsConnecting(true)
        );
        if (controller.signal.aborted) return;
        setOutput(result.text);
        setAlternatives(result.alternatives);
        setIsVerified(result.model === 'verified-dictionary');
        if (result.usage) {
          const u = result.usage;
          if (u.authed || u.wordsUsed < 0 || u.wordLimit <= 0) setFreeLeft(u.authed ? null : freeLeft);
          else setFreeLeft(u.wordsUsed * 2 > u.wordLimit ? Math.max(0, u.wordLimit - u.wordsUsed) : null);
        }
        history.save({ sourceText: text, translatedText: result.text, sourceLanguage: from, targetLanguage: to });
      } catch (err) {
        if (controller.signal.aborted) return;
        if (cached) {
          setOutput(cached.translatedText);
        } else {
          const limit = err instanceof Error && err.message === WORD_LIMIT_ERROR;
          setIsLimit(limit);
          if (limit) setFreeLeft(0);
          setOutput('');
          setError(
            limit
              ? "You've used today's free words. Sign in for unlimited translation, or come back tomorrow. Dictionary words still work."
              : err instanceof Error
                ? err.message
                : "Translation didn't come through. Please try again."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsTranslating(false);
          setIsConnecting(false);
        }
      }
    },
    [getAccessToken, showInstant, user, freeLeft]
  );

  const acceptConsent = (): void => {
    localStorage.setItem(CONSENT_KEY, '1');
    consentRef.current = true;
    setConsent(true);
    setError(null);
    lastKeyRef.current = '';
    const text = input.trim();
    if (text) void runTranslation(text, source, true);
  };

  // Auto-translate: dictionary words instantly, sentences after a short pause.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const text = input.trim();
    if (!text) {
      abortRef.current?.abort();
      lastKeyRef.current = '';
      resetOutput();
      return;
    }
    if (showInstant(text, source)) return;
    debounceRef.current = window.setTimeout(() => void runTranslation(text, source), 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // runTranslation intentionally excluded: it changes with streaming state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, source]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // The copied check stays until the user edits the text.
  useEffect(() => {
    setCopied(false);
  }, [input]);

  const swap = (): void => {
    const canReverse = output && !error;
    setTurns((t) => t + 180);
    lastKeyRef.current = '';
    if (canReverse) {
      setInput(output);
      setOutput(input);
    }
    setSource(target);
  };

  const copy = async (): Promise<void> => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(output);
      ok = true;
    } catch {
      // Clipboard API blocked (older browsers, iframes, strict permissions): use the legacy path.
      ok = legacyCopy(output);
    }
    if (ok) {
      navigator.vibrate?.(10);
      setCopied(true);
    } else {
      toast.error("Couldn't copy. Select the text and copy it instead.");
    }
  };

  const paste = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInput(text.slice(0, maxChars));
    } catch {
      toast.error('Paste is blocked by your browser. Use your keyboard instead.');
    }
  };

  const shareText = async (): Promise<void> => {
    const text = `${sourceLabel}: ${input.trim()}\n\n${targetLabel}: ${output}\n\nTranslated with Zomi Translator`;
    if (navigator.share) {
      await navigator.share({ text }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(text).catch(() => undefined);
      toast.success('Copied to share');
    }
  };

  const hasResult = output.length > 0 && !error && !isTranslating;
  const words = input.trim() ? input.trim().split(/\s+/).length : 0;

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 md:pt-10">
        <div className="mb-5 hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight">{t('Translate')}</h1>
          <p className="mt-1 text-sm text-white/70">{t('Free, instant Zomi ⇄ English. No sign-in needed.')}</p>
        </div>

        {showBanner && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm">
            <span className="flex-1 text-white/80">Get Zomi Translator on your phone.</span>
            <a href="https://apps.apple.com/app/id6804354953" target="_blank" rel="noreferrer" className="font-semibold text-[#00f0ff] hover:underline">App Store</a>
            <a href="https://play.google.com/store/apps/details?id=com.rork.zomilanguageportal" target="_blank" rel="noreferrer" className="font-semibold text-[#00f0ff] hover:underline">Google Play</a>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                localStorage.setItem(BANNER_KEY, '1');
                setShowBanner(false);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!online && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-[#ffd000]/35 bg-[#ffd000]/10 px-4 py-3 text-sm font-medium text-[#ffd000]">
            <WifiOff className="h-4 w-4" aria-hidden="true" />
            {t('Offline: dictionary words still work.')}
          </div>
        )}

        {!consent && (
          <GlassCard tint="cyan" className="mb-4">
            <p className="text-sm leading-relaxed text-white/85">
              Dictionary words are translated in your browser. Sentences are sent securely to the Zomi AI translation
              service, which uses Google Gemini and the Rork AI gateway as a backup. Your text is not used to identify
              you. See the <Link to="/privacy" className="text-[#00f0ff] underline">Privacy Policy</Link>.
            </p>
            <button
              type="button"
              onClick={acceptConsent}
              className="mt-3 inline-flex min-h-11 items-center rounded-full bg-[#00f0ff] px-5 text-sm font-semibold text-[#0b1020] transition-transform active:scale-95"
            >
              Agree &amp; continue
            </button>
          </GlassCard>
        )}

        {/* Language selector */}
        <GlassCard tint="cyan" className="mb-3 p-2">
          <div className="flex items-center gap-2">
            <span className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#00f0ff]/10 text-[17px] font-semibold">{sourceLabel}</span>
            <button
              type="button"
              onClick={swap}
              aria-label={`Swap languages. Now translating ${sourceLabel} to ${targetLabel}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00f0ff]/85 to-[#8c5cff]/85 text-white shadow-lg transition-transform active:scale-90"
            >
              <ArrowLeftRight
                className="h-5 w-5 transition-transform duration-300 motion-reduce:transition-none"
                style={{ transform: `rotate(${turns}deg)` }}
                aria-hidden="true"
              />
            </button>
            <span className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#00f0ff]/20 text-[17px] font-semibold text-[#00f0ff]">{targetLabel}</span>
          </div>
        </GlassCard>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {/* Input */}
          <GlassCard tint="purple" className="flex flex-col">
            <div className="mb-2 flex items-center">
              <span className="flex-1 text-sm font-semibold">{sourceLabel}</span>
              <button type="button" onClick={() => void paste()} aria-label="Paste" className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10">
                <ClipboardPaste className="h-5 w-5" />
              </button>
              {input && (
                <button type="button" onClick={() => setInput('')} aria-label="Clear text" className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10">
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, maxChars))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void runTranslation(input.trim(), source, true);
                }
              }}
              placeholder={t('Type or paste text')}
              aria-label={`Text to translate from ${sourceLabel}`}
              rows={5}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              className="min-h-[8rem] w-full flex-1 resize-none bg-transparent text-[20px] leading-relaxed text-white placeholder:text-white/50 focus:outline-none md:min-h-[14rem]"
            />
            <div className="mt-2 flex justify-between text-xs tabular-nums text-white/60">
              <span>
                {input.length}/{maxChars}
              </span>
              <span>
                {words} {words === 1 ? 'word' : 'words'}
              </span>
            </div>
          </GlassCard>

          {/* Output */}
          <GlassCard tint="green" className="flex flex-col">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold">{targetLabel}</span>
              {isVerified && output && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1d9bf0]/20 px-2 py-0.5 text-[11px] font-bold text-[#7cc8ff]">
                  <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                  {t('Verified')}
                </span>
              )}
              <span className="flex-1" />
              {hasResult && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      void shareTranslationImage({ sourceLabel, targetLabel, sourceText: input.trim(), translatedText: output }).catch(() =>
                        toast.error("Couldn't create the image.")
                      )
                    }
                    aria-label={t('Share as image')}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => void shareText()} aria-label={t('Share as text')} className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10">
                    <Share2 className="h-5 w-5" />
                  </button>
                  <span aria-live="polite" className="min-w-[3.5rem] text-right text-xs font-semibold text-[#5dffb0]">
                    {copied ? t('Copied') : ''}
                  </span>
                  <button type="button" onClick={() => void copy()} aria-label={t('Copy')} className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-transform hover:bg-white/10 active:scale-90">
                    {copied ? <Check className="h-5 w-5 text-[#5dffb0]" /> : <Copy className="h-5 w-5" />}
                  </button>
                </>
              )}
            </div>
            <div className="min-h-[5rem] flex-1 md:min-h-[14rem]" aria-live="polite">
              {error ? (
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  {isLimit ? <Sparkles className="h-5 w-5 text-[#00f0ff]" /> : null}
                  <p className="text-[15px] leading-relaxed text-white/85">{error}</p>
                  {isLimit ? (
                    <Link to="/settings" className="inline-flex min-h-11 items-center rounded-full bg-[#00f0ff] px-5 text-sm font-semibold text-[#0b1020]">
                      {t('Sign in')}
                    </Link>
                  ) : !consent ? (
                    <button
                      type="button"
                      onClick={acceptConsent}
                      className="inline-flex min-h-11 items-center rounded-full bg-[#00f0ff] px-5 text-sm font-semibold text-[#0b1020] transition-transform active:scale-95"
                    >
                      Agree &amp; continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void runTranslation(input.trim(), source, true)}
                      className="inline-flex min-h-11 items-center rounded-full bg-white/10 px-5 text-sm font-semibold"
                    >
                      {t('Try again')}
                    </button>
                  )}
                </div>
              ) : output ? (
                <p className="whitespace-pre-wrap text-[20px] leading-relaxed text-white">{output}</p>
              ) : isTranslating ? (
                <div className="flex items-center gap-2 text-white/75">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isConnecting ? 'Connecting…' : 'Translating…'}
                </div>
              ) : (
                <p className="text-[20px] text-white/50">{t('Translation appears here')}</p>
              )}
            </div>
            {alternatives.length > 0 && hasResult && (
              <div className="mt-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/60">Also</p>
                <div className="flex flex-wrap gap-2">
                  {alternatives.map((alt, i) => (
                    <button
                      key={`${alt}-${i}`}
                      type="button"
                      onClick={() => {
                        const previous = output;
                        setOutput(alt);
                        setAlternatives(alternatives.map((a, j) => (j === i ? previous : a)));
                      }}
                      className="min-h-9 rounded-full border border-white/25 bg-white/10 px-3.5 text-sm transition-colors hover:border-[#00f0ff]/50"
                    >
                      {alt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {freeLeft !== null && freeLeft > 0 && !user && (
          <p className="mt-3 text-center text-sm text-white/65">{t('Free today')}: {freeLeft.toLocaleString()} {t('words left')}</p>
        )}
      </div>
    </SiteLayout>
  );
};

export default Translate;

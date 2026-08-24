import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  BadgeCheck,
  Check,
  Copy,
  Link2,
  Volume2,
} from 'lucide-react';

import { SiteLayout, PageHeader, GlassCard } from '@/components/SiteLayout';
import { API_BASE_URL } from '@/lib/config';

interface SharedTranslation {
  shareId: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  model: string | null;
  createdAt: string;
}

/** Display name for a language code ('zomi', 'english', or any other code). */
function languageLabel(code: string): string {
  if (code === 'zomi') return 'Zomi';
  if (code === 'english') return 'English';
  return code
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function fetchSharedTranslation(id: string): Promise<SharedTranslation> {
  const res = await fetch(`${API_BASE_URL}/api/share/${encodeURIComponent(id)}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('not_found');
    throw new Error('fetch_failed');
  }
  return (await res.json()) as SharedTranslation;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-white/70 transition hover:border-cyan-300/40 hover:text-white"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function TranslationPanel({
  language,
  text,
  confidence,
}: {
  language: string;
  text: string;
  confidence?: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300/90">
            {language}
          </span>
          {confidence !== undefined && confidence > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#63C0FF]/10 px-2 py-0.5 text-[11px] font-medium text-[#63C0FF]">
              <BadgeCheck size={12} />
              Official · {confidence}% confidence
            </span>
          )}
        </div>
        <CopyButton text={text} label={`${language} text`} />
      </div>
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">{text}</p>
    </div>
  );
}

const SharedTranslation = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['shared-translation', id],
    queryFn: () => fetchSharedTranslation(id),
    enabled: id.length > 0,
    retry: 0,
  });

  const [copiedLink, setCopiedLink] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      return;
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const speak = (text: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } catch {
      /* speech not supported */
    }
  };

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Shared Translation"
        title="Zomi Translation"
        subtitle="Shared with you via Zomi Language Portal"
      />

      <div className="mx-auto w-full max-w-3xl px-5 pb-20">
        {isLoading && (
          <GlassCard>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300/70 border-t-transparent" />
              Loading translation…
            </div>
          </GlassCard>
        )}

        {isError && (
          <GlassCard>
            <p className="text-sm text-white/70">
              {error instanceof Error && error.message === 'not_found'
                ? 'This shared translation could not be found. The link may have expired or been mistyped.'
                : 'We could not load this shared translation right now. Please check your connection and try again.'}
            </p>
            <Link
              to="/translate"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-300/90 px-4 py-2 text-sm font-semibold text-[#0B1226] transition hover:bg-cyan-200"
            >
              Translate your own text
            </Link>
          </GlassCard>
        )}

        {data && (
          <GlassCard>
            <div className="space-y-4">
              <TranslationPanel
                language={languageLabel(data.sourceLanguage)}
                text={data.sourceText}
              />

              <div className="flex items-center gap-3 text-white/30">
                <span className="h-px flex-1 bg-white/10" />
                <ArrowLeftRight size={16} />
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <TranslationPanel
                language={languageLabel(data.targetLanguage)}
                text={data.translatedText}
                confidence={data.confidence}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-white/80 transition hover:border-cyan-300/40 hover:text-white"
              >
                {copiedLink ? (
                  <Check size={15} className="text-emerald-400" />
                ) : (
                  <Link2 size={15} />
                )}
                {copiedLink ? 'Link copied' : 'Copy link'}
              </button>
              <button
                type="button"
                onClick={() => speak(data.translatedText)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-white/80 transition hover:border-cyan-300/40 hover:text-white"
              >
                <Volume2 size={15} />
                Listen
              </button>
              <Link
                to="/translate"
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-cyan-300/90 px-4 py-2 text-sm font-semibold text-[#0B1226] transition hover:bg-cyan-200"
              >
                Translate your own text
              </Link>
            </div>

            <p className="mt-4 text-xs text-white/35">
              Translated with AI (Google Gemini) · Zomi Language Portal ·{' '}
              <Link to="/privacy" className="underline decoration-white/20 hover:text-white/60">
                Privacy Policy
              </Link>
            </p>
          </GlassCard>
        )}
      </div>
    </SiteLayout>
  );
};

export default SharedTranslation;

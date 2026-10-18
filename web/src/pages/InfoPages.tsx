import { CheckCircle2, Mail } from 'lucide-react';

import { SiteLayout, PageHeader, GlassCard } from '@/components/SiteLayout';
import { INFO, type InfoSection, type LegalPage } from '@/lib/infoPages';

function SectionCard({ section, tint }: { section: InfoSection; tint?: 'cyan' | 'green' | 'pink' }) {
  return (
    <GlassCard tint={tint}>
      <h2 className="text-lg font-bold">{section.title}</h2>
      <div className="mt-2 space-y-2.5 text-[15px] leading-relaxed text-white/85">
        {section.body && <p>{section.body}</p>}
        {section.paragraphs?.map((p) => <p key={p}>{p}</p>)}
        {section.bullets && section.bullets.length > 0 && (
          <ul className="list-disc space-y-1.5 pl-5 marker:text-[#00f0ff]">
            {section.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </div>
    </GlassCard>
  );
}

export const AboutPage = () => {
  const tints: ('cyan' | 'green' | 'pink')[] = ['cyan', 'green', 'pink'];
  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-8 text-center sm:px-6 md:pt-12">
        <img src="/zomi-logo.png" alt="" className="mx-auto h-20 w-20 rounded-2xl shadow-[0_0_30px_rgba(0,240,255,0.3)]" />
        <h1 className="mt-4 text-3xl font-bold">Zomi Translator</h1>
        <p className="mt-2 text-white/80">{INFO.about.tagline}</p>
      </div>
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 sm:px-6">
        {INFO.about.sections.map((s, i) => (
          <SectionCard key={s.id ?? s.title} section={s} tint={tints[i % tints.length]} />
        ))}
      </div>
    </SiteLayout>
  );
};

function Legal({ page }: { page: LegalPage }) {
  return (
    <SiteLayout>
      <PageHeader eyebrow="Legal" title={page.title} subtitle={`Last updated ${INFO.lastUpdated}`} />
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 sm:px-6">
        <GlassCard tint="cyan">
          <h2 className="text-lg font-bold">In short</h2>
          <ul className="mt-3 space-y-2">
            {page.summary.map((s) => (
              <li key={s} className="flex gap-2.5 text-[15px] leading-relaxed text-white/85">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00ff88]" aria-hidden="true" />
                {s}
              </li>
            ))}
          </ul>
        </GlassCard>
        <p className="px-1 text-[15px] leading-relaxed text-white/85">{page.intro}</p>
        {page.sections.map((s) => (
          <SectionCard key={s.title} section={s} />
        ))}
      </div>
    </SiteLayout>
  );
}

export const PrivacyPage = () => <Legal page={INFO.privacy} />;
export const TermsPage = () => <Legal page={INFO.terms} />;

export const HelpPage = () => (
  <SiteLayout>
    <PageHeader eyebrow="Support" title={INFO.help.title} subtitle={INFO.help.intro} />
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 sm:px-6">
      <a
        href={`mailto:${INFO.supportEmail}?subject=${encodeURIComponent('Zomi Translator support')}`}
        className="flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-2xl bg-[#00f0ff] font-bold text-[#0b1020] transition-transform active:scale-[0.98]"
      >
        <Mail className="h-5 w-5" aria-hidden="true" />
        Email support
      </a>
      <p className="text-center text-sm text-white/70">{INFO.supportEmail}</p>

      <h2 className="pt-4 text-xl font-bold">Frequently asked questions</h2>
      <div className="space-y-3">
        {INFO.help.faqs.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-white/20 bg-white/[0.07] p-5 backdrop-blur-xl">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold marker:hidden">
              {f.q}
              <span className="text-xl text-[#00f0ff] transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true">+</span>
            </summary>
            <p className="mt-3 text-[15px] leading-relaxed text-white/85">{f.a}</p>
          </details>
        ))}
      </div>

      <h2 className="pt-4 text-xl font-bold">Troubleshooting</h2>
      <GlassCard tint="yellow">
        <ul className="space-y-3">
          {INFO.help.troubleshooting.map((t) => (
            <li key={t.title}>
              <p className="font-semibold">{t.title}</p>
              <p className="text-[15px] text-white/85">{t.body}</p>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  </SiteLayout>
);

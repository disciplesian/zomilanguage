import { Mail, MessageCircleQuestion, Smartphone, Globe, LifeBuoy } from 'lucide-react';

import { SiteLayout, PageHeader, GlassCard } from '@/components/SiteLayout';
import { SUPPORT_EMAIL } from '@/lib/config';

const FAQS = [
  {
    q: 'Why do I need an account to translate?',
    a: 'The Zomi Language Portal is a members-only service. Accounts let us keep the translation service accountable, save your history and glossary across devices, and give verified community members recognition. Signing up is free with Google or Apple.',
  },
  {
    q: 'Which form of Zomi does the translator use?',
    a: 'Translations use standard written Zomi — the form used in the Zomi Bible, hymnal, and modern publications — and the translator supports seven registers, from everyday conversation to formal and scriptural language, so results match the context you need.',
  },
  {
    q: 'How do I get the blue verification badge?',
    a: 'Open your account page and submit a verification request explaining who you are and how you use the Zomi language. A portal administrator reviews every request manually.',
  },
  {
    q: 'Is my translation history private?',
    a: 'Your history is tied to your account and synced privately across your devices. Portal administrators can view service activity for moderation and abuse prevention. See our Privacy Policy for full detail.',
  },
  {
    q: 'How do I delete my account and data?',
    a: `Email ${SUPPORT_EMAIL} from the address you signed up with and ask for deletion. We remove your profile, translation history and glossary within 30 days.`,
  },
  {
    q: 'The translation looks wrong — what should I do?',
    a: 'AI translation is a helpful assistant, not a replacement for a fluent speaker. Add your own terms to your personal glossary to improve future results, and email us examples so we can keep improving the model.',
  },
];

const Support = () => (
  <SiteLayout>
    <PageHeader
      eyebrow="Support"
      title="We're here to help"
      subtitle="Answers to common questions, and a direct line to a real person when you need one."
    />

    <div className="mx-auto w-full max-w-3xl px-5 pb-20">
      <GlassCard>
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#00f0ff]/30 bg-[#00f0ff]/10">
            <Mail className="h-5 w-5 text-[#00f0ff]" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Contact support</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">
              Email us and we aim to reply within 2 business days.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#00f0ff] px-5 py-2.5 text-sm font-semibold text-[#10131f] transition-transform hover:scale-[1.03]"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </GlassCard>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <GlassCard>
          <Smartphone className="h-5 w-5 text-[#8c5cff]" />
          <h3 className="mt-3 font-semibold">Mobile apps</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-white/55">
            Zomi Language Portal is available for iPhone and Android. Your account works across
            every device.
          </p>
        </GlassCard>
        <GlassCard>
          <Globe className="h-5 w-5 text-[#00ff88]" />
          <h3 className="mt-3 font-semibold">Web portal</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-white/55">
            Prefer a browser? Everything works on the web — translate, manage your account and
            request verification.
          </p>
        </GlassCard>
      </div>

      <div className="mt-10">
        <div className="mb-5 flex items-center gap-2.5">
          <MessageCircleQuestion className="h-5 w-5 text-[#00f0ff]" />
          <h2 className="text-xl font-bold">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-white/12 bg-white/[0.05] p-5 backdrop-blur-xl"
            >
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {faq.q}
                  <span className="text-white/35 transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      <GlassCard className="mt-10">
        <div className="flex items-start gap-4">
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-[#ffd000]" />
          <div>
            <h2 className="font-semibold">Troubleshooting</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/60">
              <li>
                <strong className="text-white/80">Sign-in window will not open:</strong> allow
                pop-ups for this site, then try again.
              </li>
              <li>
                <strong className="text-white/80">"Session expired":</strong> sign out and sign back
                in to refresh your access.
              </li>
              <li>
                <strong className="text-white/80">Translation fails repeatedly:</strong> check your
                internet connection; the service falls back to a secondary model automatically.
              </li>
              <li>
                <strong className="text-white/80">History missing on a new device:</strong> make
                sure you signed in with the same Google or Apple account.
              </li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  </SiteLayout>
);

export default Support;

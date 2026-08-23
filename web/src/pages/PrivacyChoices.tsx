import { Download, Trash2, Eye, SlidersHorizontal, Mail } from 'lucide-react';

import { SiteLayout, PageHeader, GlassCard } from '@/components/SiteLayout';
import { SUPPORT_EMAIL } from '@/lib/config';

const CHOICES = [
  {
    icon: Eye,
    tone: 'text-[#00f0ff]',
    title: 'Access your data',
    body: 'Ask for a copy of everything held against your account: profile details, role and verification status, translation history and glossary entries.',
    action: `Email ${SUPPORT_EMAIL} with the subject "Data access request" from your registered address. We respond within 30 days.`,
  },
  {
    icon: Download,
    tone: 'text-[#8c5cff]',
    title: 'Export your data',
    body: 'Receive your translation history and personal glossary in a portable, machine-readable file.',
    action: `Email ${SUPPORT_EMAIL} with the subject "Data export request". We send your file within 30 days.`,
  },
  {
    icon: Trash2,
    tone: 'text-[#ff5e5e]',
    title: 'Delete your account and data',
    body: 'Permanently remove your profile, translation history, glossary and verification record from the portal.',
    action: `Email ${SUPPORT_EMAIL} with the subject "Delete my account". Deletion completes within 30 days and cannot be undone.`,
  },
  {
    icon: SlidersHorizontal,
    tone: 'text-[#ffd000]',
    title: 'Control device permissions',
    body: 'Camera, microphone and photo access are only used for the features you invoke, and can be withdrawn at any time.',
    action: 'iPhone: Settings › Zomi Language Portal. Android: Settings › Apps › Zomi Language Portal › Permissions. Web: use your browser\'s site settings.',
  },
];

const PrivacyChoices = () => (
  <SiteLayout>
    <PageHeader
      eyebrow="Legal"
      title="Your privacy choices"
      subtitle="You control the personal data the Zomi Language Portal holds about you. Here is exactly how to exercise each right."
    />

    <div className="mx-auto w-full max-w-3xl px-5 pb-20">
      <div className="space-y-4">
        {CHOICES.map((choice) => (
          <GlassCard key={choice.title}>
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06]">
                <choice.icon className={`h-5 w-5 ${choice.tone}`} />
              </span>
              <div>
                <h2 className="font-semibold">{choice.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{choice.body}</p>
                <p className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-relaxed text-white/70">
                  {choice.action}
                </p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="mt-6">
        <div className="flex items-start gap-4">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#00ff88]" />
          <div>
            <h2 className="font-semibold">No selling, no advertising tracking</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">
              We do not sell or share your personal information for advertising, and the portal does
              not run third-party ad tracking. There is nothing to opt out of, but if you have any
              question about how your data is used, email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#00f0ff] underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  </SiteLayout>
);

export default PrivacyChoices;

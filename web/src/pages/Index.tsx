import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  History,
  BookOpen,
  Volume2,
  Users,
  Smartphone,
} from 'lucide-react';

import { SiteLayout, GlassCard } from '@/components/SiteLayout';
import { useAuth } from '@/lib/auth';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Register-aware translation',
    body: 'Seven registers — from everyday speech to scripture and formal writing — so the result fits how Zomi is really spoken.',
    tone: 'text-[#00f0ff]',
  },
  {
    icon: Volume2,
    title: 'Natural pronunciation',
    body: 'Hear any translation read aloud with natural AI speech, then practise with the pronunciation guide.',
    tone: 'text-[#ff4d9e]',
  },
  {
    icon: BookOpen,
    title: 'Personal glossary',
    body: 'Teach the translator your family, village and church terms. Your glossary shapes every future translation.',
    tone: 'text-[#ffd000]',
  },
  {
    icon: History,
    title: 'History that follows you',
    body: 'Every translation is saved to your account and synced across iPhone, Android and the web.',
    tone: 'text-[#8c5cff]',
  },
  {
    icon: ShieldCheck,
    title: 'Verified members',
    body: 'Trusted contributors earn a blue verification badge, reviewed and approved by portal administrators.',
    tone: 'text-[#63c0ff]',
  },
  {
    icon: Users,
    title: 'A members-only community',
    body: 'The portal is built for Zomi speakers and learners — accounts keep the space accountable and spam-free.',
    tone: 'text-[#00ff88]',
  },
];

const Index = () => {
  const { user } = useAuth();

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#00f0ff]">
            <Sparkles className="h-3.5 w-3.5" />
            Zomi Language Portal
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Translate Zomi with the
            <span className="bg-gradient-to-r from-[#00f0ff] via-[#8c5cff] to-[#ff4d9e] bg-clip-text text-transparent">
              {' '}
              care it deserves
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
            A free English–Zomi translation service and community portal for Zomi speakers, learners
            and families — on your phone and in your browser.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/translate"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00f0ff] px-6 py-3.5 text-base font-semibold text-[#10131f] shadow-[0_0_30px_rgba(0,240,255,0.3)] transition-transform hover:scale-[1.03] sm:w-auto"
            >
              {user ? 'Open the translator' : 'Start translating'}
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/support"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 text-base font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white sm:w-auto"
            >
              Get support
            </Link>
          </div>

          <p className="mt-5 text-sm text-white/40">
            Your first 1,500 words are free · No account needed
          </p>
        </div>

        {/* Preview card */}
        <div className="mx-auto mt-16 max-w-3xl">
          <GlassCard className="p-0">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm font-medium text-white/70">
                <span className="h-2.5 w-2.5 rounded-full bg-[#00ff88]" />
                Zomi → English
              </div>
              <span className="text-xs text-white/40">98% confidence</span>
            </div>
            <div className="grid gap-px bg-white/10 sm:grid-cols-2">
              <div className="bg-[#252a41] p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Zomi
                </p>
                <p className="text-lg leading-relaxed">Na dam maw? Ka lungdam mahmah hi.</p>
              </div>
              <div className="bg-[#252a41] p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#00f0ff]">
                  English
                </p>
                <p className="text-lg leading-relaxed text-white/90">
                  How are you? I am very grateful.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for real Zomi, not guesswork
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/55">
            Every feature exists to make translations that a Zomi speaker would actually recognise.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <GlassCard key={feature.title} className="transition-colors hover:bg-white/[0.09]">
              <feature.icon className={`h-6 w-6 ${feature.tone}`} strokeWidth={2} />
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{feature.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Platforms */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-20">
        <GlassCard className="flex flex-col items-center gap-6 p-8 text-center sm:p-12">
          <Smartphone className="h-8 w-8 text-[#00f0ff]" />
          <h2 className="max-w-xl text-2xl font-bold leading-snug sm:text-3xl">
            One account, every device
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-white/55">
            Sign in once and your history, glossary and verification status follow you between the
            iPhone app, the Android app and this website.
          </p>
          <Link
            to="/translate"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-[#10131f] transition-transform hover:scale-[1.03]"
          >
            Open the portal
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
        </GlassCard>
      </section>
    </SiteLayout>
  );
};

export default Index;

import { type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Languages, BookOpen, History, Settings, BadgeCheck, UserRound } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useUiLanguage } from '@/lib/i18n';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Languages;
  match: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Translate', icon: Languages, match: (p) => p === '/' || p.startsWith('/translate') },
  { to: '/dictionary', label: 'Dictionary', icon: BookOpen, match: (p) => p.startsWith('/dictionary') },
  { to: '/history', label: 'History', icon: History, match: (p) => p.startsWith('/history') },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    match: (p) =>
      ['/settings', '/about', '/privacy', '/terms', '/support', '/privacy-choices', '/admin', '/account'].some((r) =>
        p.startsWith(r)
      ),
  },
];

/**
 * App shell shared by every page — the same design and structure as the
 * mobile apps: bottom tabs on phones, a sidebar on tablets and desktops.
 */
export function SiteLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { t } = useUiLanguage();

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#2a2f45] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(135deg,#2a2f45_0%,#363d5a_45%,#323854_75%,#2a2f45_100%)]" />
      <div className="pointer-events-none fixed -right-24 -top-24 h-[22rem] w-[22rem] rounded-full bg-[#8c5cff]/15 blur-[90px]" />
      <div className="pointer-events-none fixed -bottom-32 -left-24 h-[22rem] w-[22rem] rounded-full bg-[#00f0ff]/12 blur-[90px]" />

      <div className="relative flex min-h-[100dvh]">
        {/* Sidebar: tablets and desktops */}
        <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-white/10 bg-[#20243a]/70 px-4 py-6 backdrop-blur-xl md:flex">
          <Link to="/" className="mb-8 flex items-center gap-3 px-2" aria-label="Zomi Translator home">
            <img src="/zomi-logo.png" alt="" className="h-10 w-10 rounded-xl object-cover shadow-[0_0_20px_rgba(0,240,255,0.25)]" />
            <span className="leading-tight">
              <span className="block text-[13px] font-extrabold tracking-[0.08em] text-[#00d9ff]">ZOMI TRANSLATOR</span>
              <span className="block text-xs text-white/70">Zomi ⇄ English</span>
            </span>
          </Link>
          <nav className="flex flex-col gap-1" aria-label="Main">
            {NAV_ITEMS.map((item) => {
              const active = item.match(location.pathname);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors',
                    active ? 'bg-[#00f0ff]/15 text-[#00f0ff]' : 'text-white/75 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {t(item.label)}
                </NavLink>
              );
            })}
          </nav>
          <div className="mt-auto space-y-1 px-2 text-xs text-white/60">
            <Link to="/support" className="block py-1 hover:text-white">{t('Help & Support')}</Link>
            <Link to="/privacy" className="block py-1 hover:text-white">{t('Privacy Policy')}</Link>
            <Link to="/terms" className="block py-1 hover:text-white">{t('Terms of Service')}</Link>
            <p className="pt-2 text-white/45">© {new Date().getFullYear()} Zomi Translator</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Compact header: phones */}
          <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-[#2a2f45]/85 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl md:hidden">
            <img src="/zomi-logo.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
            <span className="leading-tight">
              <span className="block text-[13px] font-extrabold tracking-[0.08em] text-[#00d9ff]">ZOMI TRANSLATOR</span>
              <span className="block text-xs text-white/70">Zomi ⇄ English</span>
            </span>
          </header>

          <main
            key={location.pathname}
            className="flex-1 animate-in fade-in duration-300 pb-[calc(5.5rem+env(safe-area-inset-bottom))] motion-reduce:animate-none md:pb-10"
          >
            {children}
          </main>
        </div>
      </div>

      {/* Bottom tabs: phones */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-[#2a2f45]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const active = item.match(location.pathname);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                  active ? 'text-[#00f0ff]' : 'text-white/65'
                )}
              >
                <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
                {t(item.label)}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Page heading used across the info pages. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-5 pt-6 sm:px-6 md:pt-10">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#00f0ff]">{eyebrow}</p>
      )}
      <h1 className="text-[28px] font-bold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 text-base leading-relaxed text-white/75">{subtitle}</p>}
    </div>
  );
}

/** Frosted glass card — the same surface as the mobile apps. */
export function GlassCard({
  children,
  className,
  tint,
}: {
  children: ReactNode;
  className?: string;
  tint?: 'cyan' | 'purple' | 'green' | 'pink' | 'yellow';
}) {
  const tints: Record<string, string> = {
    cyan: 'border-[#00f0ff]/45 bg-gradient-to-br from-[#00e5ff]/20 to-[#00e5ff]/[0.06]',
    purple: 'border-[#8c5cff]/45 bg-gradient-to-br from-[#7c4dff]/20 to-[#7c4dff]/[0.06]',
    green: 'border-[#00ff88]/45 bg-gradient-to-br from-[#00e676]/20 to-[#00e676]/[0.06]',
    pink: 'border-[#ff4d9e]/45 bg-gradient-to-br from-[#ff4081]/20 to-[#ff4081]/[0.06]',
    yellow: 'border-[#fff200]/45 bg-gradient-to-br from-[#ffea00]/20 to-[#ffea00]/[0.06]',
  };
  return (
    <div
      className={cn(
        'rounded-[20px] border p-5 shadow-[0_8px_32px_rgba(0,0,0,0.22)] backdrop-blur-xl',
        tint ? tints[tint] : 'border-white/25 bg-gradient-to-br from-white/15 to-white/[0.06]',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Role badge for the admin screens. */
export function RoleBadge({ role, verified }: { role: string; verified: boolean }) {
  const styles: Record<string, string> = {
    admin: 'border-[#ff4d9e]/40 bg-[#ff4d9e]/15 text-[#ff9ecb]',
    moderator: 'border-[#8c5cff]/40 bg-[#8c5cff]/15 text-[#c0a6ff]',
    user: 'border-white/20 bg-white/8 text-white/80',
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
          styles[role] ?? styles.user
        )}
      >
        {role === 'user' ? 'User' : role}
      </span>
      {verified && (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#1d9bf0]/40 bg-[#1d9bf0]/15" title="Verified">
          <BadgeCheck className="h-3 w-3 text-[#63c0ff]" />
        </span>
      )}
    </span>
  );
}

export { UserRound };

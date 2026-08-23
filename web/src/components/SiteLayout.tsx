import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Languages, Menu, X, Shield, LogOut, UserRound } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home' },
  { to: '/translate', label: 'Translate' },
  { to: '/account', label: 'Account' },
  { to: '/support', label: 'Support' },
];

/** Shared chrome: aurora background, sticky glass header, footer with legal links. */
export function SiteLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#20243a] text-white">
      {/* Atmosphere */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(140deg,#20243a_0%,#2a2f45_45%,#343a58_100%)]" />
      <div className="pointer-events-none fixed -left-40 top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-[#00f0ff]/10 blur-[120px]" />
      <div className="pointer-events-none fixed -right-40 top-[20rem] h-[34rem] w-[34rem] rounded-full bg-[#8c5cff]/12 blur-[130px]" />
      <div className="pointer-events-none fixed bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-[#ff4d9e]/8 blur-[130px]" />

      <div className="relative flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#20243a]/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
            <Link to="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#00a8c8] shadow-[0_0_20px_rgba(0,240,255,0.35)]">
                <Languages className="h-5 w-5 text-[#10131f]" strokeWidth={2.4} />
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                Zomi <span className="text-[#00f0ff]">Language</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {user ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="ml-2 flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              ) : (
                <Link
                  to="/translate"
                  className="ml-2 rounded-lg bg-[#00f0ff] px-4 py-2 text-sm font-semibold text-[#10131f] transition-transform hover:scale-[1.03]"
                >
                  Sign in
                </Link>
              )}
            </nav>

            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg border border-white/15 p-2 text-white/80 md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {menuOpen && (
            <div className="border-t border-white/10 px-5 py-3 md:hidden">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-white/10 text-white' : 'text-white/65'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setMenuOpen(false);
                  }}
                  className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/65"
                >
                  Sign out
                </button>
              )}
            </div>
          )}
        </header>

        <main key={location.pathname} className="flex-1 animate-in fade-in duration-500">
          {children}
        </main>

        <footer className="border-t border-white/10 bg-[#191c2e]/60">
          <div className="mx-auto w-full max-w-6xl px-5 py-10">
            <div className="flex flex-col gap-8 md:flex-row md:justify-between">
              <div className="max-w-sm">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00f0ff] to-[#00a8c8]">
                    <Languages className="h-4 w-4 text-[#10131f]" strokeWidth={2.4} />
                  </span>
                  <span className="font-semibold">Zomi Language Portal</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  A members-only translation service and community portal dedicated to preserving
                  and growing the Zomi language.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    Portal
                  </p>
                  <Link to="/translate" className="block text-white/60 hover:text-[#00f0ff]">
                    Translate
                  </Link>
                  <Link to="/account" className="block text-white/60 hover:text-[#00f0ff]">
                    My account
                  </Link>
                  <Link to="/support" className="block text-white/60 hover:text-[#00f0ff]">
                    Support
                  </Link>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    Legal
                  </p>
                  <Link to="/privacy" className="block text-white/60 hover:text-[#00f0ff]">
                    Privacy Policy
                  </Link>
                  <Link to="/terms" className="block text-white/60 hover:text-[#00f0ff]">
                    Terms of Use
                  </Link>
                  <Link to="/privacy-choices" className="block text-white/60 hover:text-[#00f0ff]">
                    Your privacy choices
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} Zomi Language Portal. All rights reserved.</p>
              <p>Available on iOS, Android and the web.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Section heading used across the legal and support pages. */
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
    <div className="mx-auto w-full max-w-3xl px-5 pb-6 pt-14">
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#00f0ff]">
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 text-base leading-relaxed text-white/60">{subtitle}</p>}
    </div>
  );
}

/** Glass surface used for cards throughout the portal. */
export function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/12 bg-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Role/verification badge shared by the account and admin screens. */
export function RoleBadge({ role, verified }: { role: string; verified: boolean }) {
  const styles: Record<string, string> = {
    admin: 'border-[#ff4d9e]/40 bg-[#ff4d9e]/15 text-[#ff9ecb]',
    moderator: 'border-[#8c5cff]/40 bg-[#8c5cff]/15 text-[#c0a6ff]',
    user: 'border-white/20 bg-white/8 text-white/70',
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
          styles[role] ?? styles.user
        )}
      >
        {role === 'user' ? 'Member' : role}
      </span>
      {verified && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#1d9bf0]/40 bg-[#1d9bf0]/15 px-2 py-0.5 text-[11px] font-semibold text-[#63c0ff]">
          <Shield className="h-3 w-3" />
          Verified
        </span>
      )}
    </span>
  );
}

export { UserRound };

import { Lock, LogIn, AlertCircle } from 'lucide-react';

import { GlassCard } from '@/components/SiteLayout';
import { useAuth } from '@/lib/auth';

/**
 * Sign-in card. Translation is free for the first 1,500 words; signing in
 * unlocks unlimited translation plus synced history and a personal glossary.
 */
export function SignInPanel({
  title = 'Sign in',
  message = 'Sign in with Google or Apple for unlimited translation, synced history and a personal glossary — it is free.',
}: {
  title?: string;
  message?: string;
}) {
  const { signIn, isSigningIn, error, clearError } = useAuth();

  return (
    <GlassCard className="mx-auto max-w-md text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00f0ff]/30 bg-[#00f0ff]/10">
        <Lock className="h-6 w-6 text-[#00f0ff]" />
      </span>
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mt-2.5 text-sm leading-relaxed text-white/55">{message}</p>

      {error && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#ff5e5e]/30 bg-[#ff5e5e]/10 p-3 text-left">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8a8a]" />
          <div className="flex-1">
            <p className="text-sm text-[#ffb3b3]">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="mt-1 text-xs font-medium text-white/50 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <button
          type="button"
          disabled={isSigningIn}
          onClick={() => void signIn('google')}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-[15px] font-semibold text-[#1f1f1f] transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
            />
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          disabled={isSigningIn}
          onClick={() => void signIn('apple')}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-black px-5 py-3.5 text-[15px] font-semibold text-white ring-1 ring-white/15 transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.05 12.54c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.87.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.52M14.9 5.2c.6-.74 1.01-1.75.9-2.77-.87.04-1.93.58-2.56 1.31-.56.65-1.06 1.7-.93 2.7.98.08 1.98-.5 2.59-1.24" />
          </svg>
          Continue with Apple
        </button>
      </div>

      {isSigningIn && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/50">
          <LogIn className="h-4 w-4 animate-pulse" />
          Waiting for the sign-in window…
        </p>
      )}

      <p className="mt-5 text-xs leading-relaxed text-white/35">
        By signing in you agree to our Terms of Use and Privacy Policy.
      </p>
    </GlassCard>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2,
  BadgeCheck,
  Clock,
  XCircle,
  ShieldAlert,
  LayoutDashboard,
  Languages,
  CalendarDays,
  AlertCircle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { SiteLayout, GlassCard, RoleBadge } from '@/components/SiteLayout';
import { SignInPanel } from '@/components/SignInPanel';
import { useAuth } from '@/lib/auth';
import { fetchPortalProfile, requestVerification, type PortalProfile } from '@/lib/portalApi';

const MAX_REASON = 500;

const Account = () => {
  const { user, isLoading, getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const profileQuery = useQuery<PortalProfile>({
    queryKey: ['portal-profile'],
    enabled: Boolean(user),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Your session expired. Please sign in again.');
      return fetchPortalProfile(token);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (text: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Your session expired. Please sign in again.');
      await requestVerification(token, text);
    },
    onSuccess: () => {
      setReason('');
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ['portal-profile'] });
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : 'Could not send your request.');
    },
  });

  const submitVerification = useCallback((): void => {
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setFormError('Please tell us a little more about why you should be verified.');
      return;
    }
    verifyMutation.mutate(trimmed);
  }, [reason, verifyMutation]);

  useEffect(() => {
    if (formError && reason.trim().length >= 10) setFormError(null);
  }, [reason, formError]);

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
          <SignInPanel
            title="Sign in to your account"
            message="View your membership, translation activity and verification status."
          />
        </div>
      </SiteLayout>
    );
  }

  const profile = profileQuery.data;

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-12">
        <h1 className="text-3xl font-bold tracking-tight">My account</h1>
        <p className="mt-1.5 text-sm text-white/50">
          Your Zomi Language Portal membership and activity.
        </p>

        {profileQuery.isLoading && (
          <GlassCard className="mt-8 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
          </GlassCard>
        )}

        {profileQuery.isError && (
          <GlassCard className="mt-8 border-[#ff5e5e]/30 bg-[#ff5e5e]/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#ff8a8a]" />
              <div>
                <p className="font-semibold text-[#ffb3b3]">Could not load your profile</p>
                <p className="mt-1 text-sm text-white/60">
                  {profileQuery.error instanceof Error
                    ? profileQuery.error.message
                    : 'Please try again in a moment.'}
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {profile && (
          <>
            <GlassCard className="mt-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt=""
                      className="h-14 w-14 rounded-full border border-white/20 object-cover"
                    />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#00f0ff] to-[#8c5cff] text-xl font-bold text-[#10131f]">
                      {(profile.name ?? profile.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="text-lg font-semibold">{profile.name ?? 'Portal member'}</p>
                    <p className="text-sm text-white/50">{profile.email}</p>
                    <div className="mt-2">
                      <RoleBadge role={profile.role} verified={profile.verified} />
                    </div>
                  </div>
                </div>

                {profile.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#ff4d9e] px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Admin dashboard
                  </Link>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                    <Languages className="h-3.5 w-3.5" />
                    Translations
                  </div>
                  <p className="mt-2 text-2xl font-bold text-[#00f0ff]">
                    {profile.translationCount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Member since
                  </div>
                  <p className="mt-2 text-2xl font-bold">
                    {profile.joinedAt
                      ? new Date(profile.joinedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Verification */}
            <GlassCard className="mt-5">
              <h2 className="text-lg font-semibold">Verification</h2>

              {profile.verified ? (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#1d9bf0]/30 bg-[#1d9bf0]/10 p-4">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#63c0ff]" />
                  <div>
                    <p className="font-semibold text-[#9ad4ff]">You are a verified member</p>
                    <p className="mt-1 text-sm text-white/60">
                      Your blue badge appears next to your name across the portal.
                    </p>
                  </div>
                </div>
              ) : profile.verificationStatus === 'pending' ? (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#ffd000]/30 bg-[#ffd000]/10 p-4">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#ffe066]" />
                  <div>
                    <p className="font-semibold text-[#ffe98a]">Request under review</p>
                    <p className="mt-1 text-sm text-white/60">
                      An administrator will review your request shortly.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {profile.verificationStatus === 'rejected' && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#ff5e5e]/30 bg-[#ff5e5e]/10 p-4">
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#ff8a8a]" />
                      <div>
                        <p className="font-semibold text-[#ffb3b3]">
                          Your previous request was not approved
                        </p>
                        <p className="mt-1 text-sm text-white/60">
                          You are welcome to apply again with more detail.
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="mt-3 text-sm leading-relaxed text-white/55">
                    Verification recognises trusted contributors — pastors, teachers, translators
                    and community leaders. Tell us who you are and how you use Zomi.
                  </p>

                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
                    rows={4}
                    placeholder="For example: I am a pastor in Tedim and I translate scripture for our congregation each week…"
                    className="mt-4 w-full resize-none rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] leading-relaxed text-white placeholder:text-white/30 focus:border-[#00f0ff]/50 focus:outline-none"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-white/35">
                      {reason.length}/{MAX_REASON}
                    </span>
                    <button
                      type="button"
                      onClick={submitVerification}
                      disabled={verifyMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#1d9bf0] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
                    >
                      {verifyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldAlert className="h-4 w-4" />
                      )}
                      Request verification
                    </button>
                  </div>

                  {formError && (
                    <p className="mt-3 text-sm text-[#ffb3b3]">{formError}</p>
                  )}
                </>
              )}
            </GlassCard>
          </>
        )}
      </div>
    </SiteLayout>
  );
};

export default Account;

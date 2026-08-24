import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Users,
  Languages,
  TrendingUp,
  BadgeCheck,
  Lock,
  Check,
  X,
  ShieldOff,
  Shield,
  AlertCircle,
  Trophy,
} from 'lucide-react';

import { SiteLayout, GlassCard, RoleBadge } from '@/components/SiteLayout';
import { SignInPanel } from '@/components/SignInPanel';
import DictionaryManager from '@/components/admin/DictionaryManager';
import { useAuth } from '@/lib/auth';
import {
  fetchAdminOverview,
  fetchAdminUsers,
  fetchPortalProfile,
  setAdminUserRole,
  decideAdminVerification,
  type AdminOverview,
  type PortalProfile,
  type PortalRole,
  type PortalUserRecord,
} from '@/lib/portalApi';

const ROLES: PortalRole[] = ['user', 'moderator', 'admin'];

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
      <Icon className={`h-5 w-5 ${tone}`} />
      <p className="mt-3 text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

const Admin = () => {
  const { user, isLoading, getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  const token = useCallback(async (): Promise<string> => {
    const value = await getAccessToken();
    if (!value) throw new Error('Your session expired. Please sign in again.');
    return value;
  }, [getAccessToken]);

  const profileQuery = useQuery<PortalProfile>({
    queryKey: ['portal-profile'],
    enabled: Boolean(user),
    queryFn: async () => fetchPortalProfile(await token()),
  });

  const isAdmin = profileQuery.data?.role === 'admin';

  const overviewQuery = useQuery<AdminOverview>({
    queryKey: ['admin-overview'],
    enabled: isAdmin,
    queryFn: async () => fetchAdminOverview(await token()),
  });

  const usersQuery = useQuery<PortalUserRecord[]>({
    queryKey: ['admin-users'],
    enabled: isAdmin,
    queryFn: async () => fetchAdminUsers(await token()),
  });

  const invalidate = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
  }, [queryClient]);

  const roleMutation = useMutation({
    mutationFn: async (vars: { userId: string; role: PortalRole }) => {
      await setAdminUserRole(await token(), vars.userId, vars.role);
    },
    onSuccess: invalidate,
  });

  const verificationMutation = useMutation({
    mutationFn: async (vars: { userId: string; decision: 'approve' | 'reject' }) => {
      await decideAdminVerification(await token(), vars.userId, vars.decision);
    },
    onSuccess: invalidate,
  });

  if (isLoading || (user && profileQuery.isLoading)) {
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
            title="Administrator sign-in"
            message="This area is restricted to portal administrators."
          />
        </div>
      </SiteLayout>
    );
  }

  if (!isAdmin) {
    return (
      <SiteLayout>
        <div className="mx-auto w-full max-w-md px-5 py-20">
          <GlassCard className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ff5e5e]/30 bg-[#ff5e5e]/10">
              <Lock className="h-6 w-6 text-[#ff8a8a]" />
            </span>
            <h1 className="mt-5 text-xl font-bold">Administrators only</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-white/55">
              Your account does not have administrator access to the portal dashboard.
            </p>
            <Link
              to="/account"
              className="mt-6 inline-flex rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white"
            >
              Back to my account
            </Link>
          </GlassCard>
        </div>
      </SiteLayout>
    );
  }

  const overview = overviewQuery.data;
  const users = usersQuery.data ?? [];
  const pending = users.filter((u) => u.verificationStatus === 'pending');

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin dashboard</h1>
            <p className="mt-1.5 text-sm text-white/50">
              Members, verification and translation activity across the portal.
            </p>
          </div>
          <span className="rounded-full border border-[#ff4d9e]/40 bg-[#ff4d9e]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#ff9ecb]">
            Administrator
          </span>
        </div>

        {/* Stats */}
        {overview ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={Users} label="Members" value={overview.totalUsers} tone="text-[#00f0ff]" />
            <StatTile
              icon={Languages}
              label="Translations"
              value={overview.totalTranslations}
              tone="text-[#8c5cff]"
            />
            <StatTile
              icon={TrendingUp}
              label="Today"
              value={overview.translationsToday}
              tone="text-[#00ff88]"
            />
            <StatTile
              icon={BadgeCheck}
              label="Verified"
              value={overview.verifiedUsers}
              tone="text-[#63c0ff]"
            />
          </div>
        ) : (
          <GlassCard className="mt-8 flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
          </GlassCard>
        )}

        {/* Verification queue */}
        <GlassCard className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Verification queue</h2>
            {pending.length > 0 && (
              <span className="rounded-full bg-[#ffd000]/15 px-2.5 py-0.5 text-xs font-semibold text-[#ffe066]">
                {pending.length} pending
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <p className="mt-4 text-sm text-white/45">No verification requests are waiting.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {pending.map((record) => (
                <div
                  key={record.userId}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="font-semibold">{record.name ?? record.email}</p>
                  <p className="text-xs text-white/45">{record.email}</p>
                  {record.verificationReason && (
                    <p className="mt-2.5 rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-relaxed text-white/70">
                      {record.verificationReason}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={verificationMutation.isPending}
                      onClick={() =>
                        verificationMutation.mutate({ userId: record.userId, decision: 'approve' })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#00ff88] px-3.5 py-2 text-sm font-semibold text-[#10131f] transition-transform hover:scale-[1.03] disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={verificationMutation.isPending}
                      onClick={() =>
                        verificationMutation.mutate({ userId: record.userId, decision: 'reject' })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3.5 py-2 text-sm font-semibold text-white/70 transition-colors hover:border-[#ff5e5e]/50 hover:text-[#ff8a8a] disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Members */}
        <GlassCard className="mt-6">
          <h2 className="text-lg font-semibold">Members</h2>
          {usersQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
            </div>
          ) : usersQuery.isError ? (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#ff5e5e]/30 bg-[#ff5e5e]/10 p-4">
              <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#ff8a8a]" />
              <p className="text-sm text-[#ffb3b3]">
                {usersQuery.error instanceof Error
                  ? usersQuery.error.message
                  : 'Could not load members.'}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {users.map((record) => (
                <div
                  key={record.userId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{record.name ?? record.email}</p>
                      <RoleBadge role={record.role} verified={record.verified} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-white/45">
                      {record.email} · {record.translationCount.toLocaleString()} translations
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-white/15 p-0.5">
                      {ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          disabled={roleMutation.isPending || record.role === role}
                          onClick={() => roleMutation.mutate({ userId: record.userId, role })}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                            record.role === role
                              ? 'bg-white/15 text-white'
                              : 'text-white/45 hover:text-white disabled:opacity-40'
                          }`}
                        >
                          {role === 'user' ? 'member' : role}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={verificationMutation.isPending}
                      onClick={() =>
                        verificationMutation.mutate({
                          userId: record.userId,
                          decision: record.verified ? 'reject' : 'approve',
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/65 transition-colors hover:border-[#1d9bf0]/50 hover:text-[#63c0ff] disabled:opacity-50"
                    >
                      {record.verified ? (
                        <>
                          <ShieldOff className="h-3.5 w-3.5" />
                          Revoke
                        </>
                      ) : (
                        <>
                          <Shield className="h-3.5 w-3.5" />
                          Verify
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Dictionary dataset manager */}
        <DictionaryManager token={token} />

        {/* Top translators */}
        {overview && overview.topUsers.length > 0 && (
          <GlassCard className="mt-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#ffd000]" />
              <h2 className="text-lg font-semibold">Top translators</h2>
            </div>
            <div className="mt-4 space-y-2">
              {overview.topUsers.map((entry, index) => (
                <div
                  key={entry.userId}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <span className="w-6 text-sm font-bold text-white/35">#{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{entry.name ?? entry.email}</p>
                    <p className="truncate text-xs text-white/40">{entry.email}</p>
                  </div>
                  <span className="text-sm font-bold text-[#00f0ff]">
                    {entry.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Recent translations */}
        {overview && overview.recentTranslations.length > 0 && (
          <GlassCard className="mt-6">
            <h2 className="text-lg font-semibold">Recent translations</h2>
            <div className="mt-4 space-y-3">
              {overview.recentTranslations.map((log, index) => (
                <div
                  key={`${log.userId}-${log.createdAt}-${index}`}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white/60">
                      {log.name ?? log.email}
                    </p>
                    <p className="text-xs text-white/35">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-white/80">{log.sourceText}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[#00f0ff]/85">
                    {log.translatedText}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-wider text-white/30">
                    → {log.targetLanguage} · {log.wordCount} words · {log.confidence}%
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </SiteLayout>
  );
};

export default Admin;

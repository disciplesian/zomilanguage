import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarDays,
  BadgeCheck,
  Clock,
  RefreshCw,
  Shield,
  Check,
  X,
  TrendingUp,
  ArrowLeft,
  Rocket,
  Eye,
} from 'lucide-react-native';
import GlassCard from '@/components/GlassCard';
import PageBottomNav, { PAGE_BOTTOM_NAV_SPACING } from '@/components/PageBottomNav';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchPortalProfile,
  fetchAdminOverview,
  fetchAdminUsers,
  setAdminUserRole,
  decideAdminVerification,
  type PortalRole,
  type PortalUserRecord,
} from '@/lib/portal';

const ROLES: PortalRole[] = ['user', 'moderator', 'admin'];

function formatTime(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

/**
 * Zomi Language Portal — Admin Dashboard.
 * Live view of every member, every translation, usage volume, and the
 * blue-check verification queue. Admin-only; everyone else sees a lock card.
 */
export default function AdminDashboardScreen() {
  const { user, getAccessToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['portal-profile', user?.id],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('not_signed_in');
      return fetchPortalProfile(token);
    },
    enabled: !!user,
    staleTime: 30_000,
    retry: 1,
  });

  const isAdmin = profileQuery.data?.role === 'admin';

  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('not_signed_in');
      return fetchAdminOverview(token);
    },
    enabled: isAdmin,
    retry: 1,
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('not_signed_in');
      return fetchAdminUsers(token);
    },
    enabled: isAdmin,
    retry: 1,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-profile'] }),
    ]);
  };

  const runAdminAction = async (key: string, action: () => Promise<void>) => {
    setBusyKey(key);
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleSetRole = (userId: string, role: PortalRole) =>
    runAdminAction(`role:${userId}`, async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('not_signed_in');
      await setAdminUserRole(token, userId, role);
    });

  const handleVerification = (userId: string, decision: 'approve' | 'reject') =>
    runAdminAction(`verify:${userId}`, async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('not_signed_in');
      await decideAdminVerification(token, userId, decision);
    });

  if (!user || profileQuery.isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#2A2F45', '#363D5A', '#323854', '#2A2F45']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
        <PageBottomNav />
      </View>
    );
  }

  if (profileQuery.data && !isAdmin) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#2A2F45', '#363D5A', '#323854', '#2A2F45']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: PAGE_BOTTOM_NAV_SPACING }]}
        >
          <GlassCard variant="pink" glow style={styles.card}>
            <View style={styles.centered}>
              <Shield size={34} color={Colors.secondary} />
              <Text style={styles.lockedTitle}>Admin access only</Text>
              <Text style={styles.lockedText}>
                This dashboard is restricted to portal administrators. Your account
                does not have the admin role.
              </Text>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.85}
              >
                <ArrowLeft size={15} color={Colors.textSecondary} />
                <Text style={styles.backText}>Go back</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </ScrollView>
        <PageBottomNav />
      </View>
    );
  }

  const overview = overviewQuery.data;
  const users = usersQuery.data ?? [];
  const pendingUsers = users.filter((u) => u.verificationStatus === 'pending');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2A2F45', '#363D5A', '#323854', '#2A2F45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: PAGE_BOTTOM_NAV_SPACING }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <LayoutDashboard size={24} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Zomi Language Portal</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refresh}
            disabled={overviewQuery.isFetching || usersQuery.isFetching}
            activeOpacity={0.8}
            accessibilityLabel="Refresh data"
          >
            {overviewQuery.isFetching || usersQuery.isFetching ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <RefreshCw size={17} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <GlassCard variant="pink" style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
          </GlassCard>
        ) : null}

        <GlassCard variant="green" style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Play Store Release</Text>
            <Rocket size={16} color={Colors.success} />
          </View>
          <Text style={styles.emptyText}>
            Version 1.2.0 is live for 100% of production users. Preview the listing exactly as
            users see it on Google Play.
          </Text>
          <TouchableOpacity
            style={styles.releasePreviewButton}
            onPress={() => router.push('/release')}
            activeOpacity={0.85}
            accessibilityLabel="Open the Play Store listing preview"
          >
            <Eye size={15} color={Colors.text} />
            <Text style={styles.releasePreviewText}>Preview listing</Text>
          </TouchableOpacity>
        </GlassCard>

        <GlassCard variant="cyan" glow style={styles.card}>
          <Text style={styles.sectionTitle}>Usage Overview</Text>
          {overviewQuery.isLoading ? (
            <ActivityIndicator size="small" color={Colors.accent} style={styles.loading} />
          ) : overview ? (
            <View style={styles.statsGrid}>
              <View style={styles.statTile}>
                <Users size={17} color={Colors.primary} />
                <Text style={styles.statValue}>{overview.totalUsers}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.statTile}>
                <FileText size={17} color={Colors.success} />
                <Text style={styles.statValue}>{overview.totalTranslations}</Text>
                <Text style={styles.statLabel}>Translations</Text>
              </View>
              <View style={styles.statTile}>
                <CalendarDays size={17} color={Colors.accent} />
                <Text style={styles.statValue}>{overview.translationsToday}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>
              <View style={styles.statTile}>
                <BadgeCheck size={17} color="#1D9BF0" />
                <Text style={styles.statValue}>{overview.verifiedUsers}</Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Could not load usage data. Pull to refresh.</Text>
          )}
        </GlassCard>

        <GlassCard variant="yellow" style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Verification Queue</Text>
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>{pendingUsers.length} pending</Text>
            </View>
          </View>
          {usersQuery.isLoading ? (
            <ActivityIndicator size="small" color={Colors.accent} style={styles.loading} />
          ) : pendingUsers.length === 0 ? (
            <Text style={styles.emptyText}>
              No pending requests. Verified members keep the blue check next to their name.
            </Text>
          ) : (
            pendingUsers.map((u) => (
              <View key={u.userId} style={styles.queueRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>
                    {u.name || u.email || u.userId}
                  </Text>
                  {!!u.verificationReason ? (
                    <Text style={styles.reasonText}>"{truncate(u.verificationReason, 120)}"</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.decideButton, styles.approveButton]}
                  onPress={() => handleVerification(u.userId, 'approve')}
                  disabled={busyKey === `verify:${u.userId}`}
                  activeOpacity={0.8}
                  accessibilityLabel={`Approve verification for ${u.email}`}
                >
                  {busyKey === `verify:${u.userId}` ? (
                    <ActivityIndicator size="small" color={Colors.text} />
                  ) : (
                    <Check size={15} color={Colors.text} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.decideButton, styles.rejectButton]}
                  onPress={() => handleVerification(u.userId, 'reject')}
                  disabled={busyKey === `verify:${u.userId}`}
                  activeOpacity={0.8}
                  accessibilityLabel={`Reject verification for ${u.email}`}
                >
                  <X size={15} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </GlassCard>

        <GlassCard variant="purple" style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>{users.length} total</Text>
            </View>
          </View>
          {usersQuery.isLoading ? (
            <ActivityIndicator size="small" color={Colors.accent} style={styles.loading} />
          ) : (
            users.map((u) => (
              <MemberRow
                key={u.userId}
                user={u}
                busyKey={busyKey}
                onSetRole={handleSetRole}
                onVerify={handleVerification}
              />
            ))
          )}
        </GlassCard>

        {overview && overview.topUsers.length > 0 ? (
          <GlassCard variant="green" style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Translators</Text>
              <TrendingUp size={16} color={Colors.success} />
            </View>
            {overview.topUsers.map((u, i) => (
              <View key={u.userId} style={styles.topRow}>
                <Text style={styles.rankText}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.name || u.email || u.userId}</Text>
                  {!!u.email && u.name ? (
                    <Text style={styles.userEmail}>{u.email}</Text>
                  ) : null}
                </View>
                <Text style={styles.topCount}>{u.total} translations</Text>
              </View>
            ))}
          </GlassCard>
        ) : null}

        <GlassCard variant="cyan" style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Translations</Text>
            <Clock size={16} color={Colors.primary} />
          </View>
          {overviewQuery.isLoading ? (
            <ActivityIndicator size="small" color={Colors.accent} style={styles.loading} />
          ) : !overview || overview.recentTranslations.length === 0 ? (
            <Text style={styles.emptyText}>No translations logged yet.</Text>
          ) : (
            overview.recentTranslations.map((t, i) => (
              <View key={`${t.userId}-${i}`} style={styles.logRow}>
                <View style={styles.logHeader}>
                  <Text style={styles.logUser}>{t.name || t.email || t.userId}</Text>
                  <Text style={styles.logTime}>{formatTime(t.createdAt)}</Text>
                </View>
                <Text style={styles.logSource}>{truncate(t.sourceText, 90)}</Text>
                <Text style={styles.logTarget}>{truncate(t.translatedText, 90)}</Text>
                <View style={styles.logMeta}>
                  <Text style={styles.logMetaText}>{t.wordCount} words</Text>
                  <Text style={styles.logMetaText}>→ {t.targetLanguage}</Text>
                  {t.model ? <Text style={styles.logMetaText}>{t.model}</Text> : null}
                  <Text style={styles.logMetaText}>{t.confidence}%</Text>
                </View>
              </View>
            ))
          )}
        </GlassCard>
      </ScrollView>

      <PageBottomNav />
    </View>
  );
}

function MemberRow({
  user,
  busyKey,
  onSetRole,
  onVerify,
}: {
  user: PortalUserRecord;
  busyKey: string | null;
  onSetRole: (userId: string, role: PortalRole) => void;
  onVerify: (userId: string, decision: 'approve' | 'reject') => void;
}) {
  return (
    <View style={styles.memberRow}>
      <View style={{ flex: 1 }}>
        <View style={styles.memberNameRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.name || user.email || user.userId}
          </Text>
          {user.verified ? <BadgeCheck size={13} color="#1D9BF0" /> : null}
        </View>
        {!!user.email && user.name ? (
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
        ) : null}
        <Text style={styles.memberMeta}>{user.translationCount} translations</Text>
      </View>

      <TouchableOpacity
        style={[styles.grantButton, user.verified && styles.grantButtonOff]}
        onPress={() => onVerify(user.userId, user.verified ? 'reject' : 'approve')}
        disabled={busyKey === `verify:${user.userId}`}
        activeOpacity={0.8}
        accessibilityLabel={user.verified ? 'Remove verification' : 'Grant verification'}
      >
        {busyKey === `verify:${user.userId}` ? (
          <ActivityIndicator size="small" color="#1D9BF0" />
        ) : (
          <BadgeCheck
            size={15}
            color={user.verified ? Colors.textMuted : '#1D9BF0'}
          />
        )}
      </TouchableOpacity>

      <View style={styles.rolePicker}>
        {ROLES.map((role) => {
          const active = user.role === role;
          return (
            <TouchableOpacity
              key={role}
              style={[styles.roleOption, active && styles.roleOptionActive]}
              onPress={() => !active && onSetRole(user.userId, role)}
              disabled={busyKey === `role:${user.userId}`}
              activeOpacity={0.8}
              accessibilityLabel={`Set role ${role}`}
            >
              <Text style={[styles.roleOptionText, active && styles.roleOptionTextActive]}>
                {role === 'user' ? 'Member' : role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centered: { alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 181, 71, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  loading: { marginVertical: 12 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  statTile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 1,
  },
  userEmail: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  reasonText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  decideButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: 'rgba(34, 211, 163, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 163, 0.5)',
  },
  rejectButton: {
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.4)',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  memberMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  grantButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(29, 155, 240, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(29, 155, 240, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantButtonOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  rolePicker: {
    gap: 4,
  },
  roleOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  roleOptionActive: {
    backgroundColor: 'rgba(140, 92, 255, 0.25)',
    borderColor: 'rgba(140, 92, 255, 0.6)',
  },
  roleOptionText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  roleOptionTextActive: {
    color: '#C4A8FF',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.accent,
    width: 28,
  },
  topCount: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  logRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  logUser: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
  },
  logTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  logSource: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  logTarget: {
    fontSize: 12,
    color: Colors.primary,
    lineHeight: 17,
    marginTop: 2,
  },
  logMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  logMetaText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  lockedText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  releasePreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 136, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.45)',
  },
  releasePreviewText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { BadgeCheck, Shield, ShieldCheck, LayoutDashboard, Send } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import GlassCard from './GlassCard';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPortalProfile, requestVerification } from '@/lib/portal';

const ROLE_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  admin: {
    bg: 'rgba(255, 181, 71, 0.15)',
    border: 'rgba(255, 181, 71, 0.45)',
    text: '#FFB547',
    label: 'Admin',
  },
  moderator: {
    bg: 'rgba(140, 92, 255, 0.15)',
    border: 'rgba(140, 92, 255, 0.45)',
    text: '#8C5CFF',
    label: 'Moderator',
  },
  user: {
    bg: 'rgba(0, 240, 255, 0.12)',
    border: 'rgba(0, 240, 255, 0.35)',
    text: '#00F0FF',
    label: 'Member',
  },
};

/**
 * Zomi Language Portal card: shows the signed-in member's role and
 * verification status, lets them request the blue check, and links admins
 * to the admin dashboard.
 */
export default function PortalAccountCard() {
  const { user, getAccessToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  if (!user) return null;

  if (profileQuery.isLoading) {
    return (
      <GlassCard style={styles.card}>
        <ActivityIndicator size="small" color={Colors.accent} />
      </GlassCard>
    );
  }

  const profile = profileQuery.data;
  if (!profile) return null;

  const roleStyle = ROLE_STYLES[profile.role] ?? ROLE_STYLES.user;
  const canRequest =
    !profile.verified && profile.verificationStatus !== 'pending';

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('not_signed_in');
      await requestVerification(token, reason.trim());
      setShowRequestForm(false);
      setReason('');
      setMessage('Request submitted — an admin will review it shortly.');
      await queryClient.invalidateQueries({ queryKey: ['portal-profile'] });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassCard variant="purple" style={styles.card}>
      <View style={styles.header}>
        <ShieldCheck size={18} color={Colors.tertiary} />
        <Text style={styles.title}>Portal Membership</Text>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.roleChip, { backgroundColor: roleStyle.bg, borderColor: roleStyle.border }]}>
          {profile.role === 'admin' ? (
            <Shield size={12} color={roleStyle.text} />
          ) : null}
          <Text style={[styles.roleText, { color: roleStyle.text }]}>{roleStyle.label}</Text>
        </View>

        {profile.verified ? (
          <View style={styles.verifiedChip}>
            <BadgeCheck size={13} color="#1D9BF0" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile.translationCount}</Text>
          <Text style={styles.statLabel}>Translations</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {new Date(profile.joinedAt).toLocaleDateString(undefined, {
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          <Text style={styles.statLabel}>Member since</Text>
        </View>
      </View>

      {profile.verificationStatus === 'pending' && !profile.verified ? (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            Verification request pending — an admin will review it soon.
          </Text>
        </View>
      ) : null}

      {profile.verificationStatus === 'rejected' && !profile.verified ? (
        <View style={[styles.statusRow, styles.rejectedRow]}>
          <Text style={[styles.statusText, { color: Colors.error }]}>
            Verification was not approved this time. You can submit a new request.
          </Text>
        </View>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {canRequest ? (
        showRequestForm ? (
          <View style={styles.form}>
            <Text style={styles.formLabel}>
              Tell us why you should be verified (community role, dialect expertise,
              public work for the Zomi community…)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Reason for verification"
              placeholderTextColor={Colors.textMuted}
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={500}
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRequestForm(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={submitting || reason.trim().length < 3}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <Send size={14} color={Colors.text} />
                )}
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => setShowRequestForm(true)}
            activeOpacity={0.85}
            accessibilityLabel="Request verification"
          >
            <BadgeCheck size={16} color="#1D9BF0" />
            <Text style={styles.requestText}>Request Verified Badge</Text>
          </TouchableOpacity>
        )
      ) : null}

      {profile.role === 'admin' ? (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => router.push('/admin' as never)}
          activeOpacity={0.85}
          accessibilityLabel="Open admin dashboard"
        >
          <LayoutDashboard size={16} color={Colors.accent} />
          <Text style={styles.adminText}>Open Admin Dashboard</Text>
        </TouchableOpacity>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(29, 155, 240, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(29, 155, 240, 0.45)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D9BF0',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusRow: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  rejectedRow: {
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
    borderColor: 'rgba(255, 82, 82, 0.25)',
  },
  statusText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  message: {
    fontSize: 12,
    color: Colors.success,
    marginBottom: 10,
  },
  form: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    color: Colors.text,
    fontSize: 13,
    padding: 10,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(29, 155, 240, 0.85)',
    borderRadius: 10,
    paddingVertical: 8,
  },
  submitText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(29, 155, 240, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(29, 155, 240, 0.4)',
    borderRadius: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  requestText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5BB8F5',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 181, 71, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.4)',
    borderRadius: 12,
    paddingVertical: 11,
  },
  adminText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
});

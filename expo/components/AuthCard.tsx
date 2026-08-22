import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Chrome, Apple, LogOut, RefreshCw, Cloud } from 'lucide-react-native';
import GlassCard from './GlassCard';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';

function formatSyncTime(timestamp: number | null): string {
  if (!timestamp) return 'Not synced yet';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Synced just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.floor(hours / 24)}d ago`;
}

/**
 * Account & cloud-sync card for the profile screen. Signs the user in with
 * Google or Apple (Rork Auth); once signed in, glossary and saved
 * translations sync automatically across devices.
 */
export default function AuthCard() {
  const { user, isLoading, isSigningIn, error, signIn, signOut, clearError } = useAuth();
  const { status, lastSyncedAt } = useSync();

  if (isLoading) {
    return (
      <GlassCard style={styles.card}>
        <ActivityIndicator size="small" color={Colors.accent} />
      </GlassCard>
    );
  }

  if (!user) {
    return (
      <GlassCard variant="cyan" glow style={styles.card}>
        <Text style={styles.title}>Account & Sync</Text>
        <Text style={styles.subtitle}>
          Sign in to keep your personal glossary and saved translations consistent
          across all your devices.
        </Text>

        {error ? (
          <TouchableOpacity style={styles.errorBox} onPress={clearError} activeOpacity={0.8}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        ) : null}

        {isSigningIn ? (
          <ActivityIndicator size="small" color={Colors.accent} style={styles.spinner} />
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={() => signIn('google')}
              disabled={isSigningIn}
              activeOpacity={0.85}
              accessibilityLabel="Sign in with Google"
            >
              <Chrome size={18} color="#4285F4" />
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.appleButton]}
              onPress={() => signIn('apple')}
              disabled={isSigningIn}
              activeOpacity={0.85}
              accessibilityLabel="Sign in with Apple"
            >
              <Apple size={18} color="#FFFFFF" />
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Apple</Text>
            </TouchableOpacity>
          </View>
        )}
      </GlassCard>
    );
  }

  const isSyncing = status === 'syncing';
  const isSyncError = status === 'error';

  return (
    <GlassCard variant="cyan" glow style={styles.card}>
      <View style={styles.signedInHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.name ?? user.email ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName} numberOfLines={1}>
            {user.name ?? 'Signed in'}
          </Text>
          <Text style={styles.accountEmail} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={signOut}
          activeOpacity={0.8}
          accessibilityLabel="Sign out"
        >
          <LogOut size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.syncRow}>
        {isSyncing ? (
          <RefreshCw size={14} color={Colors.accent} />
        ) : isSyncError ? (
          <RefreshCw size={14} color={Colors.error} />
        ) : (
          <Cloud size={14} color={Colors.success} />
        )}
        <Text
          style={[
            styles.syncText,
            isSyncError && { color: Colors.error },
          ]}
        >
          {isSyncing
            ? 'Syncing your glossary & translations…'
            : isSyncError
              ? 'Sync failed — will retry on your next change'
              : formatSyncTime(lastSyncedAt)}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
  },
  errorDismiss: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  spinner: {
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  googleButton: {
    backgroundColor: 'rgba(66, 133, 244, 0.9)',
  },
  appleButton: {
    backgroundColor: 'rgba(20, 20, 24, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  signedInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.accent,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  accountEmail: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  signOutButton: {
    padding: 8,
    borderRadius: 8,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 10,
    padding: 10,
  },
  syncText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
});

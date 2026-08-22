import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Chrome, Apple, Lock, ShieldCheck } from 'lucide-react-native';
import GlassCard from './GlassCard';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Shown on the Translate screen when nobody is signed in. Translation is a
 * members-only service in the Zomi Language Portal — this card collects the
 * sign-in before the translator unlocks.
 */
export default function SignInGate() {
  const { user, isSigningIn, error, signIn, clearError } = useAuth();

  // Brief window while the stored session is being restored.
  if (!user && isSigningIn) {
    return (
      <GlassCard variant="cyan" style={styles.card}>
        <ActivityIndicator size="small" color={Colors.accent} />
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="cyan" glow style={styles.card}>
      <View style={styles.iconWrap}>
        <Lock size={22} color={Colors.accent} />
      </View>
      <Text style={styles.title}>Sign in to translate</Text>
      <Text style={styles.subtitle}>
        The Zomi Translator is a members-only service of the Zomi Language Portal.
        Sign in with Google or Apple to unlock unlimited translations — your glossary
        and history then follow you across every device.
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
            <Chrome size={18} color="#FFFFFF" />
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

      <View style={styles.privacyRow}>
        <ShieldCheck size={12} color={Colors.textMuted} />
        <Text style={styles.privacyText}>Secure sign-in · Your email is never shared</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
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
    alignSelf: 'stretch',
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
    alignSelf: 'stretch',
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
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  privacyText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});

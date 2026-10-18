import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share as NativeShare,
} from 'react-native';
import { Stack, useLocalSearchParams, Link } from 'expo-router';
import Head from 'expo-router/head';
import { LinearGradient } from 'expo-linear-gradient';
import { Copy, Check, Languages, ArrowRight, AlertCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { fetchSharedTranslation, type SharedTranslation } from '@/lib/share';
import { languageLabel } from '@/constants/languages';
import GlassCard from '@/components/GlassCard';
import Colors from '@/constants/colors';

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; data: SharedTranslation }
  | { status: 'notfound' };

/** Formats a share date like "Oct 18, 2026" without adding a dependency. */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Public viewer for a shared translation (zomi.me/t/<id>).
 * Fetches the read-only share record and shows both texts with a copy button.
 */
export default function SharedTranslationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const shareId = useMemo(() => (Array.isArray(id) ? id[0] : id) ?? '', [id]);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!shareId) {
      setState({ status: 'notfound' });
      return;
    }
    setState({ status: 'loading' });
    fetchSharedTranslation(shareId).then((data) => {
      if (!alive) return;
      setState(data ? { status: 'loaded', data } : { status: 'notfound' });
    });
    return () => { alive = false; };
  }, [shareId]);

  const handleCopy = async () => {
    if (state.status !== 'loaded') return;
    const { sourceText, translatedText } = state.data;
    const message = `${sourceText}\n\n${translatedText}`;
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(message);
      } catch {
        await Clipboard.setStringAsync(message);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      await Clipboard.setStringAsync(message);
      try {
        await NativeShare.share({ message, title: 'Zomi Translation' });
      } catch {
        // User dismissed the share sheet; the text is already copied.
      }
    }
  };

  const loaded = state.status === 'loaded' ? state.data : null;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Shared Translation',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      {Platform.OS === 'web' && (
        <Head>
          <title>Shared translation — Zomi Translator</title>
          <meta name="description" content="A translation shared with Zomi Translator — free, instant Zomi ⇄ English translation." />
        </Head>
      )}

      <LinearGradient
        colors={[Colors.background, Colors.backgroundSecondary, Colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.gradientOrbs}>
        <View style={[styles.orb, styles.orbCyan]} />
        <View style={[styles.orb, styles.orbPurple]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={['rgba(0, 217, 255, 0.4)', 'rgba(108, 92, 231, 0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <Languages size={32} color={Colors.text} />
          </LinearGradient>
          <Text style={styles.title}>Zomi Translator</Text>
          <Text style={styles.subtitle}>Shared translation</Text>
        </View>

        {state.status === 'loading' && (
          <GlassCard style={styles.card}>
            <Text style={styles.bodyText}>Loading…</Text>
          </GlassCard>
        )}

        {state.status === 'notfound' && (
          <GlassCard variant="pink" style={styles.card}>
            <View style={styles.cardHeader}>
              <AlertCircle size={20} color={Colors.secondary} />
              <Text style={styles.cardTitle} accessibilityRole="header">Link not found</Text>
            </View>
            <Text style={styles.bodyText}>
              This shared translation does not exist or is no longer available.
            </Text>
          </GlassCard>
        )}

        {loaded && (
          <>
            <GlassCard style={styles.card}>
              <Text style={styles.label}>{languageLabel(loaded.sourceLanguage)}</Text>
              <Text style={styles.text}>{loaded.sourceText}</Text>
            </GlassCard>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ArrowRight size={18} color={Colors.tertiary} />
              <View style={styles.dividerLine} />
            </View>

            <GlassCard variant="cyan" style={styles.card}>
              <Text style={styles.label}>{languageLabel(loaded.targetLanguage)}</Text>
              <Text style={[styles.text, styles.translated]}>{loaded.translatedText}</Text>
            </GlassCard>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.copyButton]}
                onPress={handleCopy}
                accessibilityLabel="Copy translation"
              >
                {copied ? <Check size={18} color={Colors.text} /> : <Copy size={18} color={Colors.text} />}
                <Text style={styles.buttonText}>{copied ? 'Copied' : 'Copy'}</Text>
              </TouchableOpacity>
              <Link href="/" asChild>
                <TouchableOpacity style={[styles.button, styles.openButton]} accessibilityLabel="Open Zomi Translator">
                  <Text style={styles.buttonText}>Translate with Zomi Translator</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {formatDate(loaded.createdAt) ? (
              <Text style={styles.dateText}>{formatDate(loaded.createdAt)}</Text>
            ) : null}
          </>
        )}

        <Text style={styles.footerText}>
          Free, instant Zomi ⇄ English translation — zomi.me
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradientOrbs: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    opacity: 0.15,
  },
  orbCyan: {
    backgroundColor: Colors.primary,
    top: -80,
    left: -100,
  },
  orbPurple: {
    backgroundColor: Colors.tertiary,
    bottom: 100,
    right: -120,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.select({ web: 24, default: 20 }),
    paddingBottom: 48,
    maxWidth: 640,
    alignSelf: 'center' as const,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    marginBottom: 12,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.tertiary,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  translated: {
    fontSize: 18,
    lineHeight: 27,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
    paddingHorizontal: 8,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.glassBorder,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  copyButton: {
    backgroundColor: Colors.glassCyan,
    borderColor: Colors.glassCyanBorder,
  },
  openButton: {
    backgroundColor: Colors.glassPurple,
    borderColor: Colors.glassPurpleBorder,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    marginTop: 12,
  },
  bodyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    marginTop: 24,
  },
});

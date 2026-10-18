import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Rocket,
  ArrowLeft,
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Type,
  Image as ImageIcon,
} from 'lucide-react-native';
import GlassCard from '@/components/GlassCard';
import PageBottomNav, { PAGE_BOTTOM_NAV_SPACING } from '@/components/PageBottomNav';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPortalProfile } from '@/lib/portal';

/** The listing strings the Play listing was published with (play-store/listing/en-US.json). */
const LISTING = {
  title: 'Zomi Translator',
  shortDescription: 'Free, instant Zomi ⇄ English translation and offline Zomi dictionary.',
  fullDescription:
    'Zomi Translator is the free, fast way to translate between Zomi and English. No sign-in needed.\n\nINSTANT ZOMI WORDS\n• Dictionary words appear the moment you type, straight from a verified Zomi dictionary of more than 33,000 entries\n• Works offline: the full Zomi dictionary lives on your device\n• Search in Zomi or English, with or without tone marks, and even with a small typo\n\nFAST, ACCURATE SENTENCES\n• Sentences start appearing in about a second\n• Every translation is checked against the verified Zomi dictionary, so common terms stay consistent\n• Clear, natural Zomi that follows standard spelling and grammar\n\nMADE FOR EVERY DAY\n• Swap Zomi and English with one tap\n• History with search, favorites, swipe to delete, and Clear all\n• Share a translation as a beautiful image or as text\n• Copy with one tap\n\nFREE FOR EVERYONE\n• Dictionary words are always free and unlimited\n• Sentences are free up to a generous daily amount on each device\n• Optional sign-in with Google or Apple for unlimited translation and history that syncs between your devices\n\nWORKS EVERYWHERE\n• Designed for Android phones, tablets, foldables, and Chromebooks, with a side-by-side layout on larger screens\n• Also available on iPhone, iPad, and on the web at zomilanguage.rork.app\n\nPRIVATE BY DESIGN\n• No ads and no tracking\n• Dictionary lookups never leave your device\n• Delete your history or your account at any time in Settings\n\nTranslations of sentences are produced by AI and may contain mistakes. For important documents, please ask a fluent speaker to review.\n\nQuestions or suggestions? Email support@zomitranslator.com\n\nPrivacy: https://zomilanguage.rork.app/privacy\nTerms: https://zomilanguage.rork.app/terms',
  releaseNotes:
    'Translation is now free for everyone, with no sign-in needed. Dictionary words appear instantly as you type, even offline. Faster, more accurate sentences. New tablet layout, History search and Clear all, in-app account deletion, and improved accessibility.',
};

/** Title limit on Google Play. */
const TITLE_LIMIT = 30;
/** Short description limit on Google Play. */
const SHORT_DESC_LIMIT = 80;
/** Maximum phone screenshots per device type. */
const MAX_SCREENSHOTS = 8;

/** Release state of the last publish (kept in one place, mirrors the Play Console). */
const RELEASE = {
  version: '1.2.0',
  productionStatus: '20% staged rollout — in progress',
  internalStatus: 'Published (source track)',
  listingStatus: 'Text updated for current features',
};

const SCREENSHOTS: { key: string; source: number; defaultCaption: string }[] = [
  { key: '01-translator', source: require('../assets/store/01-translator.png'), defaultCaption: 'Instant Zomi translation' },
  { key: '02-glossary', source: require('../assets/store/02-glossary.png'), defaultCaption: 'Offline Zomi dictionary' },
  { key: '03-pronunciation', source: require('../assets/store/03-pronunciation.png'), defaultCaption: 'Say it right' },
  { key: '04-settings', source: require('../assets/store/04-settings.png'), defaultCaption: 'Made your own' },
];

const FEATURE_GRAPHIC = require('../assets/store/feature-graphic.png');
const APP_ICON = require('../assets/images/icon.png');

const PLAY = {
  bg: '#0F1113',
  text: '#E8EAED',
  textMuted: 'rgba(232, 234, 237, 0.55)',
  green: '#01875F',
};

/**
 * Store Release — Google Play listing preview for admins.
 * Shows the exact title, short description, and screenshots users see on the
 * Play Store, so nothing goes live unseen. Read-only; publishing happens
 * through the Play Console pipeline, not this screen.
 */
export default function StoreReleaseScreen() {
  const { user, getAccessToken } = useAuth();
  const router = useRouter();
  const [expanded, setExpanded] = useState<'about' | 'notes' | null>(null);
  const [captions, setCaptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(SCREENSHOTS.map((s) => [s.key, s.defaultCaption])),
  );

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

  if (!isAdmin) {
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
                The store release preview is restricted to portal administrators.
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

  const aboutExpanded = expanded === 'about';
  const notesExpanded = expanded === 'notes';

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
            <Rocket size={24} color={Colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Store Release</Text>
            <Text style={styles.headerSubtitle}>Google Play listing preview</Text>
          </View>
        </View>

        <GlassCard variant="green" style={styles.card}>
          <Text style={styles.sectionTitle}>Release Status</Text>
          <View style={styles.statusRow}>
            <CheckCircle2 size={15} color={Colors.success} />
            <Text style={styles.statusText}>
              Version {RELEASE.version} — {RELEASE.productionStatus}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <CheckCircle2 size={15} color={Colors.success} />
            <Text style={styles.statusText}>Internal testing — {RELEASE.internalStatus}</Text>
          </View>
          <View style={styles.statusRow}>
            <CheckCircle2 size={15} color={Colors.success} />
            <Text style={styles.statusText}>Listing — {RELEASE.listingStatus}</Text>
          </View>
        </GlassCard>

        <Text style={styles.previewCaption}>
          How the listing appears to users on the Play Store
        </Text>
        <View style={styles.playMock}>
          <Image
            source={FEATURE_GRAPHIC}
            style={styles.playFeatureGraphic}
            resizeMode="cover"
            accessibilityLabel="Play Store feature graphic"
          />
          <View style={styles.playHeaderRow}>
            <Image source={APP_ICON} style={styles.playIcon} accessibilityLabel="App icon" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.playTitle}>{LISTING.title}</Text>
              <Text style={styles.playMuted}>com.rork.zomilanguageportal</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={styles.playChip}>Everyone</Text>
                <Text style={styles.playChip}>No ads</Text>
              </View>
            </View>
          </View>
          <View style={styles.playInstallRow}>
            <View style={styles.playInstallButton}>
              <Text style={styles.playInstallText}>Install</Text>
            </View>
            <Text style={styles.playMuted}>Free · No sign-in needed</Text>
          </View>
          <Text style={styles.playShortDescription}>{LISTING.shortDescription}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playScreenshotRow}
          >
            {SCREENSHOTS.map((shot) => (
              <View key={shot.key} style={styles.playScreenshotWrap}>
                <Image
                  source={shot.source}
                  style={styles.playScreenshot}
                  resizeMode="cover"
                  accessibilityLabel="Store screenshot"
                />
                <TextInput
                  style={styles.playCaptionInput}
                  value={captions[shot.key] ?? ''}
                  onChangeText={(text) =>
                    setCaptions((prev) => ({ ...prev, [shot.key]: text }))
                  }
                  placeholder="Caption…"
                  placeholderTextColor={PLAY.textMuted}
                  maxLength={40}
                  returnKeyType="done"
                  accessibilityLabel={`Caption for screenshot ${shot.key}`}
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.playSection}>
            <TouchableOpacity
              style={styles.playSectionHeader}
              onPress={() => setExpanded(notesExpanded ? null : 'notes')}
              activeOpacity={0.8}
              accessibilityLabel={notesExpanded ? 'Collapse release notes' : 'Expand release notes'}
            >
              <Text style={styles.playSectionTitle}>What&apos;s new</Text>
              {notesExpanded ? (
                <ChevronUp size={16} color={PLAY.textMuted} />
              ) : (
                <ChevronDown size={16} color={PLAY.textMuted} />
              )}
            </TouchableOpacity>
            <Text style={styles.playBodyText} numberOfLines={notesExpanded ? undefined : 3}>
              {LISTING.releaseNotes}
            </Text>
          </View>
          <View style={styles.playSection}>
            <TouchableOpacity
              style={styles.playSectionHeader}
              onPress={() => setExpanded(aboutExpanded ? null : 'about')}
              activeOpacity={0.8}
              accessibilityLabel={aboutExpanded ? 'Collapse app description' : 'Expand app description'}
            >
              <Text style={styles.playSectionTitle}>About this app</Text>
              {aboutExpanded ? (
                <ChevronUp size={16} color={PLAY.textMuted} />
              ) : (
                <ChevronDown size={16} color={PLAY.textMuted} />
              )}
            </TouchableOpacity>
            <Text style={styles.playBodyText} numberOfLines={aboutExpanded ? undefined : 5}>
              {LISTING.fullDescription}
            </Text>
          </View>
        </View>

        <GlassCard variant="cyan" style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Listing Limits</Text>
            <Eye size={16} color={Colors.primary} />
          </View>
          <View style={styles.limitRow}>
            <Type size={14} color={Colors.primary} />
            <Text style={styles.limitText}>Title</Text>
            <Text
              style={[styles.limitCount, LISTING.title.length > TITLE_LIMIT && styles.limitOver]}
            >
              {LISTING.title.length}/{TITLE_LIMIT}
            </Text>
          </View>
          <View style={styles.limitRow}>
            <Type size={14} color={Colors.primary} />
            <Text style={styles.limitText}>Short description</Text>
            <Text
              style={[
                styles.limitCount,
                LISTING.shortDescription.length > SHORT_DESC_LIMIT && styles.limitOver,
              ]}
            >
              {LISTING.shortDescription.length}/{SHORT_DESC_LIMIT}
            </Text>
          </View>
          <View style={styles.limitRow}>
            <ImageIcon size={14} color={Colors.primary} />
            <Text style={styles.limitText}>Phone screenshots</Text>
            <Text
              style={[
                styles.limitCount,
                SCREENSHOTS.length > MAX_SCREENSHOTS && styles.limitOver,
              ]}
            >
              {SCREENSHOTS.length}/{MAX_SCREENSHOTS}
            </Text>
          </View>
        </GlassCard>

        <GlassCard variant="yellow" style={styles.card}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={16} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Before the next listing update</Text>
          </View>
          <Text style={styles.warningText}>
            These screenshots come from an older build and still show the glossary and
            pronunciation screens, which are removed. Replace them with fresh captures of
            Translate, Dictionary, History, and Settings before the next listing update.
          </Text>
        </GlassCard>
      </ScrollView>

      <PageBottomNav />
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
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.4)',
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
    gap: 8,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  statusText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  previewCaption: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  playMock: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: PLAY.bg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  playFeatureGraphic: {
    width: '100%',
    aspectRatio: 1024 / 500,
  },
  playHeaderRow: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    paddingBottom: 10,
  },
  playIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  playTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: PLAY.text,
  },
  playMuted: {
    fontSize: 12,
    color: PLAY.textMuted,
  },
  playChip: {
    fontSize: 10,
    color: PLAY.textMuted,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(232, 234, 237, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  playInstallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  playInstallButton: {
    backgroundColor: PLAY.green,
    borderRadius: 8,
    paddingHorizontal: 26,
    paddingVertical: 8,
  },
  playInstallText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playShortDescription: {
    fontSize: 14,
    color: 'rgba(232, 234, 237, 0.8)',
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  playScreenshotRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 6,
  },
  playScreenshotWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  playScreenshot: {
    width: 130,
    height: 282,
  },
  playCaptionInput: {
    width: 130,
    marginTop: 6,
    marginBottom: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 11,
    color: PLAY.text,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  playSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  playSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  playSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PLAY.text,
  },
  playBodyText: {
    fontSize: 13,
    color: 'rgba(232, 234, 237, 0.75)',
    lineHeight: 19,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  limitText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  limitCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
  },
  limitOver: {
    color: Colors.error,
  },
  warningText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
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
});

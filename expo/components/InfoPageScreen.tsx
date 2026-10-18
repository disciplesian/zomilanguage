import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Mail } from 'lucide-react-native';
import infoPages from '@/constants/infoPages.json';
import GlassCard from '@/components/GlassCard';
import PageBottomNav, { PAGE_BOTTOM_NAV_SPACING } from '@/components/PageBottomNav';
import Colors from '@/constants/colors';

/** The two policy pages rendered from the shared info-pages catalog. */
export type InfoPageKey = 'privacy' | 'terms';

interface InfoSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface InfoPageData {
  title: string;
  summary: string[];
  intro: string;
  sections: InfoSection[];
}

const INFO = infoPages as unknown as Record<InfoPageKey, InfoPageData> & {
  lastUpdated: string;
};

const VARIANTS = ['default', 'cyan', 'purple', 'green'] as const;

/**
 * Renders a policy page (Privacy Policy / Terms of Service) straight from the
 * shared `infoPages.json` catalog, so text stays in sync with every other app.
 */
export default function InfoPageScreen({ page }: { page: InfoPageKey }) {
  const router = useRouter();
  const data = INFO[page];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: data.title,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />

      <LinearGradient
        colors={[Colors.background, Colors.backgroundSecondary, Colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.gradientOrbs}>
        <View style={[styles.orb, styles.orbPurple]} />
        <View style={[styles.orb, styles.orbCyan]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.lastUpdated}>Last Updated: {INFO.lastUpdated}</Text>
        </View>

        <GlassCard style={styles.sectionCard} accessibilityLabel={`${data.title} summary`}>
          <Text style={styles.sectionTitle}>At a glance</Text>
          {data.summary.map((item, i) => (
            <View key={i} style={styles.summaryRow}>
              <Check size={16} color={Colors.success} style={styles.summaryIcon} />
              <Text style={styles.sectionText}>{item}</Text>
            </View>
          ))}
        </GlassCard>

        {data.sections.map((section, i) => (
          <GlassCard key={section.title} variant={VARIANTS[i % VARIANTS.length]} style={styles.sectionCard}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{section.title}</Text>
            {(section.paragraphs ?? []).map((text, j) => (
              <Text key={`p${j}`} style={styles.sectionText}>{text}</Text>
            ))}
            {(section.bullets ?? []).map((text, j) => (
              <View key={`b${j}`} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.sectionText}>{text}</Text>
              </View>
            ))}
          </GlassCard>
        ))}

        <GlassCard variant="cyan" glow style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <Mail size={22} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Questions?</Text>
          </View>
          <Text style={styles.sectionText}>
            Write to us at support@zomitranslator.com and we will get back to you.
          </Text>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => router.push('/contact' as any)}
            accessibilityLabel="Open contact support"
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </GlassCard>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Zomi Language & Literature Resource Center</Text>
        </View>
      </ScrollView>
      <PageBottomNav />
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
  orbPurple: {
    backgroundColor: Colors.tertiary,
    top: -80,
    right: -100,
  },
  orbCyan: {
    backgroundColor: Colors.primary,
    bottom: 100,
    left: -120,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.select({ web: 24, default: 20 }),
    paddingBottom: PAGE_BOTTOM_NAV_SPACING,
    maxWidth: 760,
    alignSelf: 'center' as const,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center' as const,
  },
  lastUpdated: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionCard: {
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  summaryIcon: {
    marginTop: 3,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.tertiary,
    marginTop: 8,
  },
  sectionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  contactCard: {
    marginBottom: 24,
    padding: 20,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  supportButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  supportButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});

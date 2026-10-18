import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Info, Heart, Target, Gift } from 'lucide-react-native';
import Constants from 'expo-constants';
import infoPages from '@/constants/infoPages.json';
import GlassCard from '@/components/GlassCard';
import PageBottomNav, { PAGE_BOTTOM_NAV_SPACING } from '@/components/PageBottomNav';
import Colors from '@/constants/colors';

interface AboutSection {
  id?: string;
  title: string;
  body?: string;
}

const INFO = infoPages as unknown as { about: { tagline: string; sections: AboutSection[] } };

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'About',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }} 
      />
      
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
            <Info size={32} color={Colors.text} />
          </LinearGradient>
          <Text style={styles.appName}>Zomi Translator</Text>
        </View>

        <Text style={styles.tagline}>{INFO.about.tagline}</Text>
        <Text style={styles.versionLine}>Version {Constants.expoConfig?.version ?? '1.2.0'}</Text>

        {INFO.about.sections.map((section, i) => {
          const Icon = [Target, Gift, Heart][i % 3];
          const variant = (['cyan', 'green', 'pink'] as const)[i % 3];
          return (
            <GlassCard key={section.id ?? section.title} variant={variant} style={styles.missionCard}>
              <View style={styles.missionHeader}>
                <Icon size={22} color={Colors.primary} />
                <Text style={styles.missionTitle} accessibilityRole="header">{section.title}</Text>
              </View>
              <Text style={styles.missionText}>{section.body}</Text>
            </GlassCard>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Zomi Language & Literature Resource Center</Text>
          <Text style={styles.footerSubtext}>support@zomitranslator.com</Text>
        </View>
      </ScrollView>
      <PageBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  tagline: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center' as const,
    marginTop: -8,
  },
  versionLine: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
    marginTop: 4,
    marginBottom: 16,
  },
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
    paddingBottom: PAGE_BOTTOM_NAV_SPACING,
    maxWidth: 1000,
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
  appName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  missionCard: {
    marginBottom: 16,
    padding: 20,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  missionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  scriptureCard: {
    marginBottom: 16,
    padding: 20,
  },
  scriptureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  scriptureLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.tertiary,
    textTransform: 'uppercase' as const,
  },
  scriptureVerse: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    fontStyle: 'italic' as const,
    marginBottom: 12,
  },
  scriptureReference: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  infoCard: {
    marginBottom: 16,
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  statsCard: {
    marginBottom: 16,
    padding: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  featuresCard: {
    marginBottom: 16,
    padding: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.tertiary,
    marginTop: 6,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sourceCard: {
    marginBottom: 16,
    padding: 20,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  sourceText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  sourceLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  teamCard: {
    marginBottom: 24,
    padding: 20,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  teamTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  teamText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  blessingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
  disclaimerCard: {
    marginBottom: 16,
    padding: 20,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  disclaimerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

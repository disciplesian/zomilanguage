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
import { 
  Info, 
  Globe, 
  Heart, 
  Target,
  BookOpen,
} from 'lucide-react-native';
import GlassCard from '@/components/GlassCard';
import Colors from '@/constants/colors';

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

        <GlassCard variant="cyan" glow style={styles.missionCard}>
          <View style={styles.missionHeader}>
            <Target size={24} color={Colors.primary} />
            <Text style={styles.missionTitle}>Our Mission</Text>
          </View>
          <Text style={styles.missionText}>
            Zomi Translator is dedicated to preserving and promoting the Zomi language through modern technology. 
            Our mission is to make the Zomi language accessible to everyone, from native speakers wanting to 
            preserve their heritage to language enthusiasts eager to learn this beautiful Tibeto-Burman language.
          </Text>
        </GlassCard>

        <GlassCard variant="purple" style={styles.scriptureCard}>
          <View style={styles.scriptureHeader}>
            <BookOpen size={20} color={Colors.tertiary} />
            <Text style={styles.scriptureLabel}>Guiding Scripture</Text>
          </View>
          <Text style={styles.scriptureVerse}>
            {"\u201CGo therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, teaching them to observe all that I have commanded you.\u201D"}
          </Text>
          <Text style={styles.scriptureReference}>— Matthew 28:19-20 (ESV)</Text>
        </GlassCard>

        <GlassCard style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Globe size={20} color={Colors.success} />
            <Text style={styles.infoTitle}>About the Zomi Language</Text>
          </View>
          <Text style={styles.infoText}>
            Zomi is a Tibeto-Burman language spoken by approximately 500,000 people across Myanmar, 
            India, and Bangladesh. The Zomi people are an ethnic group comprising various tribes 
            who share cultural and linguistic similarities.
          </Text>
          <Text style={styles.infoText}>
            The language has a rich oral tradition with songs, stories, and proverbs passed down 
            through generations. Our app aims to document and digitize this linguistic heritage 
            for future generations.
          </Text>
        </GlassCard>

        <GlassCard variant="purple" style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Key Features</Text>
          <View style={styles.featuresList}>
            {[
              'AI-powered translation between Zomi and English',
              'Comprehensive dictionary',
              'Interactive language learning lessons',
              'Pronunciation guides with phonetic spelling',
              'Community-driven word contributions',
              'Offline access to essential phrases',
              'Daily word of the day feature',
              'Grammar tips and cultural notes',
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureBullet} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard variant="green" style={styles.sourceCard}>
          <Text style={styles.sourceTitle}>Powered by AI</Text>
          <Text style={styles.sourceText}>
            Our translations are powered by Zomi AI, specifically tuned for the Zomi language to ensure high accuracy and natural-sounding translations.
          </Text>
        </GlassCard>

        <GlassCard variant="yellow" style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>AI-Generated Content Notice</Text>
          <Text style={styles.disclaimerText}>
            This application utilizes AI-powered translation and language processing technologies. While we strive for accuracy, AI technology is continuously evolving. Due to the nature of AI development, the app's performance and accuracy will gradually improve over time, but no guarantee of perfection is provided. We recommend verifying critical translations with native speakers.
          </Text>
        </GlassCard>

        <GlassCard style={styles.teamCard}>
          <View style={styles.teamHeader}>
            <Heart size={20} color={Colors.secondary} fill={Colors.secondary} />
            <Text style={styles.teamTitle}>Made with Love</Text>
          </View>
          <Text style={styles.teamText}>
            Zomi Translator is developed by a passionate team dedicated to language preservation 
            and cultural heritage. We believe that every language is a unique window into human 
            experience and deserves to be celebrated and protected.
          </Text>
          <Text style={styles.teamText}>
            Special thanks to all the native speakers, linguists, and community members who 
            have contributed to making this app possible.
          </Text>
          <Text style={styles.blessingText}>
            May God bless everyone who uses this tool, and may it serve as a blessing for generations to come.
          </Text>
        </GlassCard>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Zomi Language & Literature Resource Center</Text>
          <Text style={styles.footerSubtext}>Preserving Heritage Through Technology</Text>
        </View>
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
    paddingBottom: 40,
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

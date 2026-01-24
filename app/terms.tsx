import React from 'react';
import { ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { FileText, Shield, Users, AlertCircle } from 'lucide-react-native';
import GlassCard from '@/components/GlassCard';
import Colors from '@/constants/colors';

export default function TermsScreen() {


  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Terms of Service',
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <LinearGradient
            colors={['rgba(140, 92, 255, 0.4)', 'rgba(0, 240, 255, 0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <FileText size={32} color={Colors.text} />
          </LinearGradient>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.updated}>Last Updated: January 4, 2026</Text>
        </View>

        <GlassCard variant="purple" style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={20} color={Colors.tertiary} />
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          </View>
          <Text style={styles.paragraph}>
            By accessing and using Zomi Translator (&quot;the App&quot;), you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use the App.
          </Text>
        </GlassCard>

        <GlassCard variant="cyan" style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>2. User Accounts</Text>
          </View>
          <Text style={styles.paragraph}>
            • You must create an account to access certain features{'\n'}
            • You are responsible for maintaining account security{'\n'}
            • You must provide accurate and complete information{'\n'}
            • One account per person; no account sharing{'\n'}
            • You must be 13 years or older to create an account
          </Text>
        </GlassCard>

        <GlassCard variant="pink" style={styles.card}>
          <View style={styles.cardHeader}>
            <AlertCircle size={20} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>3. Acceptable Use</Text>
          </View>
          <Text style={styles.paragraph}>
            You agree NOT to:{'\n'}
            • Post offensive, hateful, or discriminatory content{'\n'}
            • Spam or harass other users{'\n'}
            • Submit false or misleading translations{'\n'}
            • Attempt to hack or disrupt the service{'\n'}
            • Use the App for illegal purposes{'\n'}
            • Impersonate others or misrepresent affiliation
          </Text>
        </GlassCard>

        <GlassCard variant="green" style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={20} color={Colors.success} />
            <Text style={styles.sectionTitle}>4. Community Guidelines</Text>
          </View>
          <Text style={styles.paragraph}>
            Forum and contribution guidelines:{'\n'}
            • Be respectful and constructive{'\n'}
            • Stay on topic{'\n'}
            • No advertising or self-promotion{'\n'}
            • Respect intellectual property{'\n'}
            • Report violations to moderators
          </Text>
        </GlassCard>

        <GlassCard variant="yellow" style={styles.card}>
          <View style={styles.cardHeader}>
            <FileText size={20} color={Colors.accent} />
            <Text style={styles.sectionTitle}>5. User Content & Contributions</Text>
          </View>
          <Text style={styles.paragraph}>
            • You retain ownership of content you submit{'\n'}
            • You grant us a license to use, display, and distribute your contributions{'\n'}
            • You warrant that you have rights to submit the content{'\n'}
            • We may remove content that violates these terms{'\n'}
            • Word contributions may be moderated before approval{'\n'}
            • All contributions must respect cultural sensitivity and accuracy
          </Text>
        </GlassCard>

        <GlassCard variant="purple" style={styles.card}>
          <View style={styles.cardHeader}>
            <AlertCircle size={20} color={Colors.tertiary} />
            <Text style={styles.sectionTitle}>6. AI Translation Disclaimer</Text>
          </View>
          <Text style={styles.paragraph}>
            • This app utilizes AI-generated translation technology that is continuously evolving{'\n'}
            • Translations are AI-assisted and may contain errors{'\n'}
            • Due to the nature of AI development, accuracy and performance will gradually improve over time{'\n'}
            • No guarantee of perfection or absolute accuracy is provided{'\n'}
            • Do not rely on translations for legal, medical, or critical use{'\n'}
            • We are not responsible for translation accuracy or misinterpretations{'\n'}
            • User contributions improve but don&apos;t guarantee accuracy{'\n'}
            • Always verify important translations with native speakers
          </Text>
        </GlassCard>

        <GlassCard variant="cyan" style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>7. Dictionary & Data Usage</Text>
          </View>
          <Text style={styles.paragraph}>
            • Dictionary data is for personal, non-commercial use only{'\n'}
            • Bulk downloading or scraping is prohibited{'\n'}
            • Data is continuously updated and improved by the community{'\n'}
            • Respect the cultural heritage and intellectual contributions
          </Text>
        </GlassCard>

        <GlassCard variant="green" style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={20} color={Colors.success} />
            <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
          </View>
          <Text style={styles.paragraph}>
            The App, including design, code, branding, and original dictionary content, is protected by copyright and trademark laws. You may not copy, modify, reverse engineer, or redistribute without explicit written permission from Zomi Language & Literature Resource Center.
          </Text>
        </GlassCard>

        <GlassCard variant="yellow" style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={20} color={Colors.accent} />
            <Text style={styles.sectionTitle}>9. Privacy & Data Protection</Text>
          </View>
          <Text style={styles.paragraph}>
            Your use of the App is governed by our Privacy Policy. We collect and process data as described in that policy. We use encryption and secure practices to protect your information. You have the right to access, modify, or delete your personal data at any time.
          </Text>
        </GlassCard>

        <GlassCard variant="purple" style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={20} color={Colors.tertiary} />
            <Text style={styles.sectionTitle}>10. Moderation & Community Standards</Text>
          </View>
          <Text style={styles.paragraph}>
            • Moderators may warn, suspend, or ban users who violate these terms{'\n'}
            • Moderation decisions are at moderator/admin discretion{'\n'}
            • Repeated violations may result in permanent account termination{'\n'}

            • Appeals can be submitted to admin@zomitranslator.com
          </Text>
        </GlassCard>

        <GlassCard variant="cyan" style={styles.card}>
          <View style={styles.cardHeader}>
            <AlertCircle size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>11. Disclaimers & Warranties</Text>
          </View>
          <Text style={styles.paragraph}>
            THE APP IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE UNINTERRUPTED OR ERROR-FREE SERVICE. WE ARE NOT RESPONSIBLE FOR DATA LOSS, TRANSLATION ERRORS, OR SERVICE INTERRUPTIONS.
          </Text>
        </GlassCard>

        <GlassCard variant="pink" style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={20} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>12. Limitation of Liability</Text>
          </View>
          <Text style={styles.paragraph}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, ZOMI LANGUAGE & LITERATURE RESOURCE CENTER AND ITS AFFILIATES ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, REVENUE, OR BUSINESS OPPORTUNITIES.
          </Text>
        </GlassCard>

        <GlassCard variant="green" style={styles.card}>
          <View style={styles.cardHeader}>
            <FileText size={20} color={Colors.success} />
            <Text style={styles.sectionTitle}>13. Changes to Terms</Text>
          </View>
          <Text style={styles.paragraph}>
            We reserve the right to update these Terms at any time. Material changes will be announced through the App or via email. Continued use after changes constitutes acceptance of the new terms. The &quot;Last Updated&quot; date will reflect any modifications.
          </Text>
        </GlassCard>

        <GlassCard variant="yellow" style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={20} color={Colors.accent} />
            <Text style={styles.sectionTitle}>14. Account Termination</Text>
          </View>
          <Text style={styles.paragraph}>
            We reserve the right to terminate or suspend accounts at our discretion, with or without notice, for violations of these Terms. You may also delete your account at any time through the Settings page. Upon termination, your data will be removed in accordance with our Privacy Policy.
          </Text>
        </GlassCard>



        <GlassCard variant="cyan" style={styles.footer}>
          <Text style={styles.footerText}>
            By using Zomi Translator, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. Thank you for being part of our community and helping preserve the Zomi language and culture.
          </Text>
        </GlassCard>
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
  orbPurple: {
    backgroundColor: Colors.tertiary,
    top: -100,
    left: -80,
  },
  orbCyan: {
    backgroundColor: Colors.primary,
    bottom: 100,
    right: -120,
  },
  scrollView: {
    flex: 1,
  },
  content: {
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
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  updated: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  card: {
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  paragraph: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  footer: {
    padding: 20,
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
    lineHeight: 22,
    textAlign: 'center' as const,
  },
});

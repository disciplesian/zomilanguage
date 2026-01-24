import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield } from 'lucide-react-native';
import GlassCard from '@/components/GlassCard';
import Colors from '@/constants/colors';

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Privacy Policy',
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
          <LinearGradient
            colors={['rgba(108, 92, 231, 0.4)', 'rgba(0, 217, 255, 0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <Shield size={32} color={Colors.text} />
          </LinearGradient>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last Updated: January 2, 2026</Text>
        </View>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.sectionText}>
            Welcome to Zomi Translator. We are committed to protecting your privacy and ensuring 
            the security of your personal information. This Privacy Policy explains how we collect, 
            use, disclose, and safeguard your information when you use our mobile application.
          </Text>
          <Text style={styles.sectionText}>
            By using Zomi Translator, you agree to the collection and use of information in 
            accordance with this policy. If you do not agree with our policies, please do not 
            use our application.
          </Text>
        </GlassCard>

        <GlassCard variant="cyan" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          
          <Text style={styles.subTitle}>2.1 Personal Information</Text>
          <Text style={styles.sectionText}>
            We may collect personal information that you voluntarily provide when using our app:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Account information (name, email) if you create an account</Text>
            <Text style={styles.bulletItem}>• Profile information you choose to share</Text>
            <Text style={styles.bulletItem}>• User-contributed translations and phrases</Text>
            <Text style={styles.bulletItem}>• Forum posts and community interactions</Text>
          </View>

          <Text style={styles.subTitle}>2.2 Usage Information</Text>
          <Text style={styles.sectionText}>
            We automatically collect certain information when you use our app:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Device information (type, operating system)</Text>
            <Text style={styles.bulletItem}>• App usage statistics and learning progress</Text>
            <Text style={styles.bulletItem}>• Translation history (stored locally on your device)</Text>
            <Text style={styles.bulletItem}>• Crash reports and error logs</Text>
          </View>
        </GlassCard>

        <GlassCard variant="purple" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            We use the information we collect for the following purposes:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• To provide and maintain our translation services</Text>
            <Text style={styles.bulletItem}>• To personalize your learning experience</Text>
            <Text style={styles.bulletItem}>• To improve our dictionary and translation accuracy</Text>
            <Text style={styles.bulletItem}>• To facilitate community features and contributions</Text>
            <Text style={styles.bulletItem}>• To send you updates and notifications (with your consent)</Text>
            <Text style={styles.bulletItem}>• To analyze usage patterns and improve our app</Text>
            <Text style={styles.bulletItem}>• To respond to your inquiries and support requests</Text>
          </View>
        </GlassCard>

        <GlassCard variant="green" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. Data Storage and Security</Text>
          <Text style={styles.sectionText}>
            We implement appropriate technical and organizational security measures to protect 
            your personal information against unauthorized access, alteration, disclosure, or 
            destruction.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Translation history is stored locally on your device</Text>
            <Text style={styles.bulletItem}>• Account data is encrypted during transmission</Text>
            <Text style={styles.bulletItem}>• We use secure cloud infrastructure for data storage</Text>
            <Text style={styles.bulletItem}>• Regular security audits and updates</Text>
          </View>
        </GlassCard>

        <GlassCard variant="yellow" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>5. Data Sharing</Text>
          <Text style={styles.sectionText}>
            We do not sell, trade, or rent your personal information to third parties. We may 
            share your information only in the following circumstances:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• With your explicit consent</Text>
            <Text style={styles.bulletItem}>• To comply with legal obligations</Text>
            <Text style={styles.bulletItem}>• To protect our rights and safety</Text>
            <Text style={styles.bulletItem}>• With service providers who assist in app operations</Text>
          </View>
          <Text style={styles.sectionText}>
            User contributions (translated words, phrases) may be shared publicly in the 
            community section with your username, helping to grow our dictionary.
          </Text>
        </GlassCard>

        <GlassCard variant="pink" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>6. Your Rights</Text>
          <Text style={styles.sectionText}>
            You have the following rights regarding your personal information:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Access: Request a copy of your personal data</Text>
            <Text style={styles.bulletItem}>• Correction: Request correction of inaccurate data</Text>
            <Text style={styles.bulletItem}>• Deletion: Request deletion of your personal data</Text>
            <Text style={styles.bulletItem}>• Export: Download your data in a portable format</Text>
            <Text style={styles.bulletItem}>• Opt-out: Unsubscribe from marketing communications</Text>
          </View>
          <Text style={styles.sectionText}>
            To exercise any of these rights, please contact us through our in-app Support page.
          </Text>
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>7. Children&apos;s Privacy</Text>
          <Text style={styles.sectionText}>
            Zomi Translator is designed for users of all ages, including children who want to 
            learn the Zomi language. We do not knowingly collect personal information from 
            children under 13 without parental consent. If you believe we have collected such 
            information, please contact us immediately.
          </Text>
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>8. AI Technology Notice</Text>
          <Text style={styles.sectionText}>
            This app is powered by AI-generated translation technology. Since this application 
            utilizes AI technology that is continuously evolving, the accuracy and performance 
            will gradually improve over time. Due to the developmental nature of AI, no guarantee 
            of absolute accuracy is provided. We are committed to improving the service as AI 
            technology advances.
          </Text>
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
          <Text style={styles.sectionText}>
            Our app may contain links to third-party websites or integrate with third-party 
            services. We are not responsible for the privacy practices of these external sites. 
            We encourage you to review their privacy policies before providing any personal 
            information.
          </Text>
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
          <Text style={styles.sectionText}>
            We may update this Privacy Policy from time to time. We will notify you of any 
            changes by posting the new Privacy Policy on this page and updating the &quot;Last 
            Updated&quot; date. You are advised to review this Privacy Policy periodically for 
            any changes.
          </Text>
        </GlassCard>

        <GlassCard variant="cyan" glow style={styles.contactCard}>
          <Text style={styles.sectionTitle}>11. Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions about this Privacy Policy or our data practices, please 
            contact us through our in-app Support page.
          </Text>
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={() => router.push('/contact' as any)}
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </GlassCard>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Zomi Language & Literature Resource Center</Text>
          <Text style={styles.footerSubtext}>Your privacy is our priority</Text>
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
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
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
  subTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletList: {
    gap: 8,
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingLeft: 8,
  },
  contactCard: {
    marginBottom: 24,
    padding: 20,
  },
  contactInfo: {
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    color: Colors.text,
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
  supportButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});

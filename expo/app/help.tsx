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
import { LifeBuoy, MessageCircle, Wrench } from 'lucide-react-native';
import infoPages from '@/constants/infoPages.json';
import GlassCard from '@/components/GlassCard';
import PageBottomNav, { PAGE_BOTTOM_NAV_SPACING } from '@/components/PageBottomNav';
import Colors from '@/constants/colors';

interface Faq { q: string; a: string }
interface Troubleshooter { title: string; body: string }

const INFO = infoPages as unknown as {
  lastUpdated: string;
  help: { title: string; intro: string; faqs: Faq[]; troubleshooting: Troubleshooter[] };
};

/** Help & Support — FAQs and troubleshooting from the shared info-pages catalog. */
export default function HelpScreen() {
  const router = useRouter();
  const { help } = INFO;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Help & Support',
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
            <LifeBuoy size={32} color={Colors.text} />
          </LinearGradient>
          <Text style={styles.title}>{help.title}</Text>
        </View>

        <Text style={styles.intro}>{help.intro}</Text>

        <GlassCard variant="cyan" style={styles.card}>
          <View style={styles.cardHeader}>
            <MessageCircle size={20} color={Colors.primary} />
            <Text style={styles.cardTitle} accessibilityRole="header">Common questions</Text>
          </View>
          {help.faqs.map((faq, i) => (
            <View key={i} style={styles.faqBlock}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            </View>
          ))}
        </GlassCard>

        <GlassCard variant="purple" style={styles.card}>
          <View style={styles.cardHeader}>
            <Wrench size={20} color={Colors.tertiary} />
            <Text style={styles.cardTitle} accessibilityRole="header">Troubleshooting</Text>
          </View>
          {help.troubleshooting.map((item, i) => (
            <View key={i} style={styles.faqBlock}>
              <Text style={styles.faqQuestion}>{item.title}</Text>
              <Text style={styles.faqAnswer}>{item.body}</Text>
            </View>
          ))}
        </GlassCard>

        <GlassCard variant="green" glow style={styles.card}>
          <Text style={styles.cardTitle}>Still need a human?</Text>
          <Text style={[styles.faqAnswer, { marginBottom: 12 }]}>
            Email support@zomitranslator.com — we reply within 2 business days.
          </Text>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.location.href = 'mailto:support@zomitranslator.com';
              } else {
                router.push('/contact' as any);
              }
            }}
            accessibilityLabel="Contact support"
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </GlassCard>
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
    maxWidth: 760,
    alignSelf: 'center' as const,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  intro: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  card: {
    marginBottom: 16,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  faqBlock: {
    marginBottom: 14,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  supportButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  supportButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});

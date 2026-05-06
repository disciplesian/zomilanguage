import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Settings, 
  Info, 
  Mail, 
  ChevronRight,
  Shield,
  Heart,
  ExternalLink,
  BookOpen,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import GlassCard from '@/components/GlassCard';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handlePress = useCallback((action: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    switch (action) {
      case 'about':
        router.push('/about' as any);
        break;
      case 'privacy':
        router.push('/privacy' as any);
        break;
      case 'contact':
        router.push('/contact' as any);
        break;
      case 'pronunciation':
        router.push('/pronunciation-guide' as any);
        break;
      case 'terms':
        router.push('/terms' as any);
        break;
      case 'glossary':
        router.push('/glossary' as any);
        break;
      default:
        console.log('Action:', action);
    }
  }, [router]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.backgroundTertiary, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.gradientOrbs}>
        <View style={[styles.orb, styles.orbPurple, { backgroundColor: colors.tertiary }]} />
        <View style={[styles.orb, styles.orbCyan, { backgroundColor: colors.primary }]} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.header}>
            <LinearGradient
              colors={['rgba(108, 92, 231, 0.4)', 'rgba(0, 217, 255, 0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.headerIcon, { borderColor: colors.glassBorder }]}
            >
              <Settings size={26} color={colors.text} />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Customize your experience</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Personalisation</Text>

            <GlassCard style={styles.aboutCard}>
              <TouchableOpacity
                style={styles.aboutItem}
                onPress={() => handlePress('glossary')}
              >
                <View style={[styles.aboutIcon, { backgroundColor: colors.glassYellow }]}>
                  <BookOpen size={20} color={colors.accent} />
                </View>
                <Text style={[styles.aboutText, { color: colors.text }]}>My Tedim Glossary</Text>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
            
            <GlassCard style={styles.aboutCard}>
              <TouchableOpacity 
                style={styles.aboutItem}
                onPress={() => handlePress('contact')}
              >
                <View style={[styles.aboutIcon, { backgroundColor: colors.glassGreen }]}>
                  <Mail size={20} color={colors.success} />
                </View>
                <Text style={[styles.aboutText, { color: colors.text }]}>Contact Support</Text>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            
            <GlassCard style={styles.aboutCard}>
              <TouchableOpacity 
                style={styles.aboutItem}
                onPress={() => handlePress('about')}
              >
                <View style={[styles.aboutIcon, { backgroundColor: colors.glassCyan }]}>
                  <Info size={20} color={colors.primary} />
                </View>
                <Text style={[styles.aboutText, { color: colors.text }]}>About Zomi Translator</Text>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.settingDivider, { backgroundColor: colors.glassBorder }]} />

              <TouchableOpacity 
                style={styles.aboutItem}
                onPress={() => handlePress('privacy')}
              >
                <View style={[styles.aboutIcon, { backgroundColor: colors.glassPurple }]}>
                  <Shield size={20} color={colors.tertiary} />
                </View>
                <Text style={[styles.aboutText, { color: colors.text }]}>Privacy Policy</Text>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.settingDivider, { backgroundColor: colors.glassBorder }]} />

              <TouchableOpacity 
                style={styles.aboutItem}
                onPress={() => handlePress('terms')}
              >
                <View style={[styles.aboutIcon, { backgroundColor: colors.glassYellow }]}>
                  <ExternalLink size={20} color={colors.accent} />
                </View>
                <Text style={[styles.aboutText, { color: colors.text }]}>Terms of Service</Text>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </GlassCard>
          </View>

          <GlassCard variant="cyan" style={styles.madeWithLove}>
            <View style={styles.loveContent}>
              <Heart size={20} color={colors.secondary} fill={colors.secondary} />
              <Text style={[styles.loveText, { color: colors.textSecondary }]}>Made with love for the Zomi community</Text>
            </View>
          </GlassCard>

          <View style={styles.scriptureFooter}>
            <Text style={[styles.scriptureVerse, { color: colors.textSecondary }]}>
              {"\u201CTrust in the Lord with all your heart and lean not on your own understanding.\u201D"}
            </Text>
            <Text style={[styles.scriptureRef, { color: colors.textMuted }]}>— Proverbs 3:5 (NIV)</Text>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Zomi Translator</Text>
            <Text style={[styles.footerSubtext, { color: colors.textMuted }]}>© 2026 Zomi Language & Literature Resource Center</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    top: -120,
    right: -100,
  },
  orbCyan: {
    bottom: 100,
    left: -150,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 14,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  settingDivider: {
    height: 1,
    marginLeft: 74,
  },
  aboutCard: {
    padding: 0,
    overflow: 'hidden',
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  aboutIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 14,
  },
  madeWithLove: {
    marginBottom: 16,
    padding: 16,
  },
  loveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loveText: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  footerSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  scriptureFooter: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
  },
  scriptureVerse: {
    fontSize: 14,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 6,
  },
  scriptureRef: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});

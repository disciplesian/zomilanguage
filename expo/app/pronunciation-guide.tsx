import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Volume2, 
  BookOpen,
  Mic,
  PlayCircle,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import GlassCard from '@/components/GlassCard';
import PageBottomNav, { PAGE_BOTTOM_NAV_SPACING } from '@/components/PageBottomNav';
import Colors from '@/constants/colors';

interface PronunciationRule {
  letter: string;
  sound: string;
  example: string;
  zomiWord: string;
  audioExample?: string;
}

const PRONUNCIATION_RULES: PronunciationRule[] = [
  { letter: 'A', sound: 'ah', example: 'father', zomiWord: 'Ann (food)' },
  { letter: 'E', sound: 'eh', example: 'bed', zomiWord: 'Mei (fire)' },
  { letter: 'I', sound: 'ee', example: 'see', zomiWord: 'Ni (sun)' },
  { letter: 'O', sound: 'oh', example: 'go', zomiWord: 'Hoi (good)' },
  { letter: 'U', sound: 'oo', example: 'moon', zomiWord: 'Tui (water)' },
  { letter: 'Ng', sound: 'ng', example: 'sing', zomiWord: 'Nga (five)' },
  { letter: 'Kh', sound: 'k + h', example: 'blockhead', zomiWord: 'Khat (one)' },
  { letter: 'Th', sound: 'th', example: 'think', zomiWord: 'Thum (three)' },
  { letter: 'Z', sound: 'z', example: 'zoo', zomiWord: 'Zuang (go)' },
  { letter: 'P', sound: 'p', example: 'pen', zomiWord: 'Pa (father)' },
];

const TONE_GUIDELINES = [
  { title: 'High Tone', description: 'Voice rises, like asking a question', example: 'An kidah?' },
  { title: 'Mid Tone', description: 'Normal speaking pitch', example: 'Maw ka' },
  { title: 'Low Tone', description: 'Voice drops slightly', example: 'Lungdam' },
  { title: 'Falling Tone', description: 'Start high, end low', example: 'Innkuan' },
];

const COMMON_MISTAKES = [
  { wrong: 'Pronouncing "Ng" as N-G', correct: 'Say it as one sound: "ng" like in "sing"' },
  { wrong: 'Skipping the "h" in Kh', correct: 'Emphasize both K and H sounds together' },
  { wrong: 'English "th" in "them"', correct: 'Use "th" as in "think" (voiceless)' },
  { wrong: 'Short vowels', correct: 'Zomi vowels are typically longer than English' },
];

export default function PronunciationGuideScreen() {
  const [activeExample, setActiveExample] = useState<string | null>(null);

  const handlePlayExample = (zomiWord: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveExample(zomiWord);
    setTimeout(() => setActiveExample(null), 1500);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Pronunciation Guide',
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
            colors={['rgba(0, 240, 255, 0.4)', 'rgba(140, 92, 255, 0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <Mic size={32} color={Colors.text} />
          </LinearGradient>
          <Text style={styles.title}>Pronunciation Guide</Text>
          <Text style={styles.subtitle}>Master Zomi sounds and tones</Text>
        </View>

        <GlassCard variant="cyan" glow style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Info size={20} color={Colors.primary} />
            <Text style={styles.infoTitle}>About Zomi Pronunciation</Text>
          </View>
          <Text style={styles.infoText}>
            Zomi uses the Latin alphabet with some unique sounds and tonal variations. 
            This guide will help you pronounce words correctly and understand the phonetic system.
          </Text>
        </GlassCard>

        <Text style={styles.sectionTitle}>Alphabet & Sounds</Text>
        <View style={styles.rulesGrid}>
          {PRONUNCIATION_RULES.map((rule, index) => (
            <GlassCard 
              key={index} 
              variant={index % 5 === 0 ? 'cyan' : index % 5 === 1 ? 'pink' : index % 5 === 2 ? 'yellow' : index % 5 === 3 ? 'purple' : 'green'}
              style={styles.ruleCard}
            >
              <View style={styles.ruleHeader}>
                <Text style={styles.ruleLetter}>{rule.letter}</Text>
                <TouchableOpacity 
                  style={styles.playButton}
                  onPress={() => handlePlayExample(rule.zomiWord)}
                >
                  {activeExample === rule.zomiWord ? (
                    <Volume2 size={20} color={Colors.accent} />
                  ) : (
                    <PlayCircle size={20} color={Colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.ruleSound}>Sound: "{rule.sound}"</Text>
              <Text style={styles.ruleExample}>Like: {rule.example}</Text>
              <View style={styles.ruleZomi}>
                <Text style={styles.ruleZomiLabel}>Example:</Text>
                <Text style={styles.ruleZomiWord}>{rule.zomiWord}</Text>
              </View>
            </GlassCard>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Tone Guidelines</Text>
        <View style={styles.toneList}>
          {TONE_GUIDELINES.map((tone, index) => (
            <GlassCard 
              key={index} 
              variant={index % 2 === 0 ? 'purple' : 'pink'}
              style={styles.toneCard}
            >
              <View style={styles.toneHeader}>
                <View style={[styles.toneDot, { backgroundColor: index % 2 === 0 ? Colors.tertiary : Colors.secondary }]} />
                <Text style={styles.toneTitle}>{tone.title}</Text>
              </View>
              <Text style={styles.toneDescription}>{tone.description}</Text>
              <View style={styles.toneExample}>
                <Text style={styles.toneExampleLabel}>Example:</Text>
                <TouchableOpacity 
                  style={styles.toneExampleButton}
                  onPress={() => handlePlayExample(tone.example)}
                >
                  <Text style={styles.toneExampleText}>{tone.example}</Text>
                  <PlayCircle size={16} color={Colors.accent} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Common Mistakes to Avoid</Text>
        <GlassCard variant="yellow" style={styles.mistakesCard}>
          {COMMON_MISTAKES.map((mistake, index) => (
            <View 
              key={index} 
              style={[styles.mistakeItem, index !== COMMON_MISTAKES.length - 1 && styles.mistakeItemBorder]}
            >
              <View style={styles.mistakeWrong}>
                <View style={styles.wrongIcon}>
                  <Text style={styles.wrongIconText}>✗</Text>
                </View>
                <Text style={styles.mistakeText}>{mistake.wrong}</Text>
              </View>
              <View style={styles.mistakeCorrect}>
                <View style={styles.correctIcon}>
                  <Text style={styles.correctIconText}>✓</Text>
                </View>
                <Text style={styles.mistakeText}>{mistake.correct}</Text>
              </View>
            </View>
          ))}
        </GlassCard>

        <GlassCard variant="green" glow style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <BookOpen size={20} color={Colors.success} />
            <Text style={styles.tipsTitle}>Practice Tips</Text>
          </View>
          <Text style={styles.tipText}>
            • Listen to native speakers as much as possible{'\n'}
            • Practice vowel sounds - they're longer than in English{'\n'}
            • Pay attention to tones - they can change word meanings{'\n'}
            • Record yourself and compare with native pronunciation{'\n'}
            • Don't be afraid to ask native speakers for feedback{'\n'}
            • Practice common phrases until they feel natural
          </Text>
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
    opacity: 0.2,
  },
  orbCyan: {
    backgroundColor: Colors.primary,
    top: -100,
    left: -120,
  },
  orbPurple: {
    backgroundColor: Colors.tertiary,
    bottom: 150,
    right: -100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: PAGE_BOTTOM_NAV_SPACING,
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
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoCard: {
    padding: 18,
    marginBottom: 24,
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
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  rulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  ruleCard: {
    width: '48%',
    padding: 14,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ruleLetter: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  playButton: {
    padding: 4,
  },
  ruleSound: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  ruleExample: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  ruleZomi: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  ruleZomiLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  ruleZomiWord: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  toneList: {
    gap: 12,
    marginBottom: 24,
  },
  toneCard: {
    padding: 16,
  },
  toneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  toneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  toneTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  toneDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  toneExample: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toneExampleLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  toneExampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  toneExampleText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  mistakesCard: {
    padding: 18,
    marginBottom: 24,
  },
  mistakeItem: {
    paddingVertical: 12,
  },
  mistakeItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  mistakeWrong: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  wrongIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrongIconText: {
    fontSize: 12,
    color: Colors.error,
  },
  mistakeCorrect: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  correctIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctIconText: {
    fontSize: 12,
    color: Colors.success,
  },
  mistakeText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tipsCard: {
    padding: 18,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  tipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
});

import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import {
  Lightbulb,
  BookOpen,
  Target,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Languages,
  Brain,
  Layers,
  Zap,
  Heart,
  FileText,
  HelpCircle,
  ChevronLeft,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';

interface TipSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: string[];
  variant?: 'cyan' | 'pink' | 'yellow' | 'purple' | 'green';
}

interface ExampleItem {
  bad: string;
  good: string;
  explanation: string;
}

export default function TranslationTipsScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const understandingSection: TipSection = {
    id: 'understanding',
    icon: <Brain size={22} color={Colors.primary} />,
    title: 'Understanding Low-Resource Languages',
    variant: 'cyan',
    content: [
      'Zomi is classified as a "low-resource language" in AI and machine learning. This means there is limited digital text data available for training translation models compared to languages like English, Spanish, or Chinese.',
      'Because of this, AI translators may sometimes produce less accurate results, especially for complex sentences, idioms, or specialized vocabulary.',
      'However, you can significantly improve translation quality by following the tips in this guide. The key is understanding how to communicate effectively with the AI translator.',
    ],
  };

  const contextSection: TipSection = {
    id: 'context',
    icon: <Layers size={22} color={Colors.accent} />,
    title: 'Why Context Matters',
    variant: 'yellow',
    content: [
      'Context is the single most important factor in getting accurate translations. The more context you provide, the better the AI can understand your intent.',
      'A single word can have multiple meanings. For example, "bank" could mean a financial institution or the side of a river. Without context, the AI must guess.',
      'Longer sentences with clear subject-verb-object structure translate better than fragments or incomplete thoughts.',
      'When translating phrases or idioms, provide the full sentence or situation where it would be used.',
    ],
  };

  const englishToZomiTips: TipSection = {
    id: 'en-to-zomi',
    icon: <ArrowRight size={22} color={Colors.secondary} />,
    title: 'English → Zomi Translation Tips',
    variant: 'pink',
    content: [
      '✓ Use simple, clear English sentences with standard grammar',
      '✓ Avoid slang, abbreviations, and informal expressions',
      '✓ Write complete sentences instead of fragments',
      '✓ Use present tense when possible for clearer translations',
      '✓ Break complex sentences into shorter, simpler ones',
      '✓ Specify the subject clearly (who is doing the action)',
      '✓ For religious texts, include the biblical reference for better accuracy',
      '✗ Avoid contractions (use "do not" instead of "do not")',
      '✗ Avoid passive voice when active voice is possible',
      '✗ Avoid idioms that may not have direct Zomi equivalents',
    ],
  };

  const zomiToEnglishTips: TipSection = {
    id: 'zomi-to-en',
    icon: <Languages size={22} color={Colors.success} />,
    title: 'Zomi → English Translation Tips',
    variant: 'green',
    content: [
      '✓ Type Zomi text using standard Zomi orthography',
      '✓ Include tone markers if available for better accuracy',
      '✓ Provide complete sentences rather than single words',
      '✓ For traditional phrases or proverbs, include any context about when they are used',
      '✓ Double-check spelling of Zomi words before translating',
      '✓ If a word has multiple spellings, use the most common one',
      '✓ For compound words, consider whether to write them as one word or separate words',
    ],
  };

  const promptingTips: TipSection = {
    id: 'prompting',
    icon: <MessageSquare size={22} color={Colors.tertiary} />,
    title: 'How to Prompt Like a Pro',
    variant: 'purple',
    content: [
      'Think of the translator as a helpful assistant who needs clear instructions.',
      'Be specific about what you want: "Translate this greeting" vs just typing the word',
      'If you need a formal translation, mention it: "formal Zomi for official letter"',
      'For technical terms, provide context: "translate \'server\' in computing context"',
      'When uncertain, try multiple phrasings of the same sentence',
      'Use the comparison tool to evaluate different translation options',
    ],
  };

  const examples: ExampleItem[] = [
    {
      bad: 'bank',
      good: 'I need to go to the bank to withdraw money.',
      explanation: 'Single words are ambiguous. Full sentences provide context for accurate translation.',
    },
    {
      bad: 'He\'s gonna be there soon',
      good: 'He will arrive there soon.',
      explanation: 'Avoid contractions and slang. Use standard English grammar.',
    },
    {
      bad: 'Break a leg!',
      good: 'I wish you success in your performance!',
      explanation: 'Idioms often don\'t translate directly. Express the actual meaning instead.',
    },
    {
      bad: 'The book was read by Mary',
      good: 'Mary read the book.',
      explanation: 'Active voice is clearer and translates more accurately than passive voice.',
    },
    {
      bad: 'FYI the mtg is @ 3',
      good: 'For your information, the meeting is at 3 o\'clock.',
      explanation: 'Abbreviations and symbols may not be recognized. Write words in full.',
    },
  ];

  const bestPractices = [
    {
      icon: <CheckCircle size={18} color={Colors.success} />,
      title: 'Review and Verify',
      description: 'Always review translations, especially for important documents. Cross-check with native speakers when possible.',
    },
    {
      icon: <Target size={18} color={Colors.primary} />,
      title: 'Start Simple',
      description: 'Begin with simple sentences. Once you get accurate results, gradually add complexity.',
    },
    {
      icon: <Sparkles size={18} color={Colors.accent} />,
      title: 'Use the Dictionary',
      description: 'Look up individual words in the dictionary first, then construct your sentence.',
    },
    {
      icon: <FileText size={18} color={Colors.secondary} />,
      title: 'Keep Records',
      description: 'Save successful translations for reference. Build your own phrase book over time.',
    },
    {
      icon: <Heart size={18} color={Colors.error} />,
      title: 'Contribute Back',
      description: 'If you find errors, report them. Community feedback helps improve the translator.',
    },
    {
      icon: <Zap size={18} color={Colors.warning} />,
      title: 'Use Batch Translation',
      description: 'For multiple phrases, use the batch translation tool for consistency.',
    },
  ];

  const commonMistakes = [
    'Translating word-by-word instead of complete sentences',
    'Using English idioms or slang that have no Zomi equivalent',
    'Forgetting to specify context for ambiguous words',
    'Relying on a single translation without verification',
    'Not checking tone or formality level needed',
    'Copying text with formatting issues or special characters',
  ];

  const qualityFactors = [
    { factor: 'Sentence Length', impact: 'Medium sentences (10-20 words) translate best' },
    { factor: 'Context Clarity', impact: 'Clear context = 60% better accuracy' },
    { factor: 'Grammar Quality', impact: 'Proper grammar = 40% fewer errors' },
    { factor: 'Technical Terms', impact: 'May need manual verification' },
    { factor: 'Proper Nouns', impact: 'Names may not translate - this is normal' },
    { factor: 'Numbers & Dates', impact: 'Usually accurate, verify formatting' },
  ];

  const renderSection = (section: TipSection) => (
    <GlassCard key={section.id} variant={section.variant} style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          {section.icon}
        </View>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {section.content.map((item, index) => (
          <Text key={index} style={styles.sectionText}>{item}</Text>
        ))}
      </View>
    </GlassCard>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Translation Guide',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                router.back();
              }}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <LinearGradient
        colors={['#2A2F45', '#363D5A', '#323854', '#2A2F45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['rgba(255, 242, 0, 0.5)', 'rgba(0, 240, 255, 0.5)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIcon}
            >
              <Lightbulb size={28} color={Colors.text} />
            </LinearGradient>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Translation Tips & Guide</Text>
              <Text style={styles.headerSubtitle}>
                Get the best results from Zomi Translator
              </Text>
            </View>
          </View>

          {/* Introduction */}
          <GlassCard style={styles.introCard}>
            <Text style={styles.introText}>
              Welcome to the Zomi Translator guide! This page will help you understand how to get 
              the most accurate translations possible. Whether you are translating from English to Zomi 
              or Zomi to English, these tips will significantly improve your results.
            </Text>
          </GlassCard>

          {/* Dictionary vs AI Translator Section */}
          <GlassCard variant="cyan" style={styles.dictionaryVsSection}>
            <View style={styles.dictionaryVsHeader}>
              <View style={styles.dictionaryVsIconRow}>
                <View style={styles.toolIconBox}>
                  <BookOpen size={20} color={Colors.primary} />
                </View>
                <Text style={styles.vsText}>vs</Text>
                <View style={styles.toolIconBox}>
                  <Brain size={20} color={Colors.tertiary} />
                </View>
              </View>
              <Text style={styles.dictionaryVsTitle}>Dictionary vs AI Translator</Text>
              <Text style={styles.dictionaryVsSubtitle}>Understanding the Right Tool for the Job</Text>
            </View>

            <View style={styles.comparisonContainer}>
              <View style={styles.comparisonColumn}>
                <View style={styles.comparisonHeader}>
                  <BookOpen size={18} color={Colors.primary} />
                  <Text style={styles.comparisonHeaderText}>Dictionary</Text>
                </View>
                <View style={styles.comparisonContent}>
                  <Text style={styles.comparisonPoint}>• Individual word definitions</Text>
                  <Text style={styles.comparisonPoint}>• Multiple meanings listed</Text>
                  <Text style={styles.comparisonPoint}>• Part of speech (noun, verb, etc.)</Text>
                  <Text style={styles.comparisonPoint}>• Fixed, curated entries</Text>
                  <Text style={styles.comparisonPoint}>• Word-level accuracy</Text>
                  <Text style={styles.comparisonPoint}>• Best for vocabulary learning</Text>
                </View>
                <View style={styles.useCaseBox}>
                  <Text style={styles.useCaseTitle}>Use When:</Text>
                  <Text style={styles.useCaseText}>• Looking up a single word{"\n"}• Learning new vocabulary{"\n"}• Checking word meanings{"\n"}• Building your lexicon</Text>
                </View>
              </View>

              <View style={styles.comparisonDivider} />

              <View style={styles.comparisonColumn}>
                <View style={styles.comparisonHeader}>
                  <Brain size={18} color={Colors.tertiary} />
                  <Text style={styles.comparisonHeaderText}>AI Translator</Text>
                </View>
                <View style={styles.comparisonContent}>
                  <Text style={styles.comparisonPoint}>• Context-aware translation</Text>
                  <Text style={styles.comparisonPoint}>• Sentence structure & grammar</Text>
                  <Text style={styles.comparisonPoint}>• Natural language flow</Text>
                  <Text style={styles.comparisonPoint}>• Dynamic, AI-generated</Text>
                  <Text style={styles.comparisonPoint}>• Contextual accuracy</Text>
                  <Text style={styles.comparisonPoint}>• Best for communication</Text>
                </View>
                <View style={styles.useCaseBox}>
                  <Text style={styles.useCaseTitle}>Use When:</Text>
                  <Text style={styles.useCaseText}>• Translating sentences{"\n"}• Writing messages/emails{"\n"}• Converting documents{"\n"}• Natural communication</Text>
                </View>
              </View>
            </View>

            <View style={styles.technicalExplanation}>
              <Text style={styles.technicalTitle}>Why Single Words Don&apos;t Work Well in AI Translator</Text>
              <Text style={styles.technicalText}>
                <Text style={styles.technicalBold}>Linguistic Reality:</Text> Most words have multiple meanings depending on context. 
                The word &ldquo;run&rdquo; in English has over 600 different meanings! Without context, the AI must guess which meaning you intend.
              </Text>
              <Text style={styles.technicalText}>
                <Text style={styles.technicalBold}>Technical Architecture:</Text> AI translators are trained on full sentences and paragraphs, 
                not isolated words. They learn patterns of how words interact with each other in natural speech. 
                When given just one word, the model lacks the surrounding linguistic cues it was designed to process.
              </Text>
              <Text style={styles.technicalText}>
                <Text style={styles.technicalBold}>Example:</Text> The English word &ldquo;book&rdquo; could be:
                {"\n"}• A noun (&ldquo;I read a book&rdquo;) → Zomi noun
                {"\n"}• A verb (&ldquo;Book a flight&rdquo;) → Zomi verb
                {"\n"}• An adjective (&ldquo;book club&rdquo;) → Different translation
              </Text>
              <Text style={styles.technicalHighlight}>
                This is not a flaw—it&apos;s how language actually works! No human translator would translate a single word 
                without asking &ldquo;in what context?&rdquo; The AI translator simply needs the same information.
              </Text>
            </View>

            <View style={styles.bestPracticeBox}>
              <View style={styles.bestPracticeHeader}>
                <CheckCircle size={18} color={Colors.success} />
                <Text style={styles.bestPracticeTitle}>Smart Translation Strategy</Text>
              </View>
              <Text style={styles.bestPracticeText}>
                <Text style={styles.bestPracticeBold}>Step 1:</Text> Use the <Text style={styles.bestPracticeHighlight}>Dictionary</Text> to look up individual words and learn their meanings.
              </Text>
              <Text style={styles.bestPracticeText}>
                <Text style={styles.bestPracticeBold}>Step 2:</Text> Use the <Text style={styles.bestPracticeHighlight}>AI Translator</Text> to translate complete sentences where those words appear in context.
              </Text>
              <Text style={styles.bestPracticeText}>
                <Text style={styles.bestPracticeBold}>Step 3:</Text> Compare results to understand how word meanings shift based on usage.
              </Text>
            </View>
          </GlassCard>

          {/* Key Insight Box */}
          <View style={styles.insightBox}>
            <LinearGradient
              colors={['rgba(0, 240, 255, 0.2)', 'rgba(140, 92, 255, 0.2)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.insightGradient}
            >
              <View style={styles.insightHeader}>
                <Zap size={20} color={Colors.accent} />
                <Text style={styles.insightTitle}>Key Insight</Text>
              </View>
              <Text style={styles.insightText}>
                <Text style={styles.highlightText}>Context is everything.</Text> The single most 
                effective way to improve translation accuracy is to provide more context. A complete 
                sentence will always translate better than a single word or phrase.
              </Text>
            </LinearGradient>
          </View>

          {/* Main Sections */}
          {renderSection(understandingSection)}
          {renderSection(contextSection)}
          {renderSection(englishToZomiTips)}
          {renderSection(zomiToEnglishTips)}
          {renderSection(promptingTips)}

          {/* Examples Section */}
          <View style={styles.examplesSection}>
            <View style={styles.examplesHeader}>
              <BookOpen size={22} color={Colors.accent} />
              <Text style={styles.examplesTitle}>Examples: Good vs. Bad Input</Text>
            </View>
            
            {examples.map((example, index) => (
              <GlassCard key={index} style={styles.exampleCard}>
                <View style={styles.exampleRow}>
                  <View style={styles.exampleBad}>
                    <Text style={styles.exampleLabel}>✗ Avoid</Text>
                    <Text style={styles.exampleBadText}>&ldquo;{example.bad}&rdquo;</Text>
                  </View>
                  <View style={styles.exampleGood}>
                    <Text style={styles.exampleLabel}>✓ Better</Text>
                    <Text style={styles.exampleGoodText}>&ldquo;{example.good}&rdquo;</Text>
                  </View>
                </View>
                <Text style={styles.exampleExplanation}>{example.explanation}</Text>
              </GlassCard>
            ))}
          </View>

          {/* Quality Factors */}
          <View style={styles.factorsSection}>
            <View style={styles.factorsHeader}>
              <Target size={22} color={Colors.primary} />
              <Text style={styles.factorsTitle}>Translation Quality Factors</Text>
            </View>
            
            <GlassCard variant="cyan" style={styles.factorsCard}>
              {qualityFactors.map((item, index) => (
                <View key={index} style={styles.factorRow}>
                  <Text style={styles.factorName}>{item.factor}</Text>
                  <Text style={styles.factorImpact}>{item.impact}</Text>
                </View>
              ))}
            </GlassCard>
          </View>

          {/* Common Mistakes */}
          <View style={styles.mistakesSection}>
            <View style={styles.mistakesHeader}>
              <AlertTriangle size={22} color={Colors.warning} />
              <Text style={styles.mistakesTitle}>Common Mistakes to Avoid</Text>
            </View>
            
            <GlassCard variant="yellow" style={styles.mistakesCard}>
              {commonMistakes.map((mistake, index) => (
                <View key={index} style={styles.mistakeRow}>
                  <Text style={styles.mistakeBullet}>•</Text>
                  <Text style={styles.mistakeText}>{mistake}</Text>
                </View>
              ))}
            </GlassCard>
          </View>

          {/* Best Practices */}
          <View style={styles.practicesSection}>
            <View style={styles.practicesHeader}>
              <Sparkles size={22} color={Colors.success} />
              <Text style={styles.practicesTitle}>Best Practices</Text>
            </View>
            
            <View style={styles.practicesGrid}>
              {bestPractices.map((practice, index) => (
                <GlassCard key={index} style={styles.practiceCard}>
                  <View style={styles.practiceIconContainer}>
                    {practice.icon}
                  </View>
                  <Text style={styles.practiceTitle}>{practice.title}</Text>
                  <Text style={styles.practiceDescription}>{practice.description}</Text>
                </GlassCard>
              ))}
            </View>
          </View>

          {/* Special Cases Section */}
          <GlassCard variant="purple" style={styles.specialSection}>
            <View style={styles.specialHeader}>
              <HelpCircle size={22} color={Colors.tertiary} />
              <Text style={styles.specialTitle}>Special Cases</Text>
            </View>
            
            <View style={styles.specialContent}>
              <Text style={styles.specialSubtitle}>Biblical & Religious Terms</Text>
              <Text style={styles.specialText}>
                For religious texts, the translator uses established Zomi biblical terminology:
              </Text>
              <View style={styles.termRow}>
                <Text style={styles.termEnglish}>Jesus</Text>
                <Text style={styles.termArrow}>→</Text>
                <Text style={styles.termZomi}>Zeisu</Text>
              </View>
              <View style={styles.termRow}>
                <Text style={styles.termEnglish}>Jesus Christ</Text>
                <Text style={styles.termArrow}>→</Text>
                <Text style={styles.termZomi}>Zeisu Khazih</Text>
              </View>
              <View style={styles.termRow}>
                <Text style={styles.termEnglish}>God</Text>
                <Text style={styles.termArrow}>→</Text>
                <Text style={styles.termZomi}>Pasian</Text>
              </View>
              
              <Text style={[styles.specialSubtitle, { marginTop: 16 }]}>Names & Proper Nouns</Text>
              <Text style={styles.specialText}>
                Personal names, place names, and brand names typically remain unchanged or are 
                transliterated phonetically. This is normal and expected behavior.
              </Text>
              
              <Text style={[styles.specialSubtitle, { marginTop: 16 }]}>Numbers & Dates</Text>
              <Text style={styles.specialText}>
                Numbers translate accurately. Dates may follow different formatting conventions 
                in Zomi. Always verify date formats for official documents.
              </Text>
            </View>
          </GlassCard>

          {/* Final Tips */}
          <GlassCard variant="green" style={styles.finalTips}>
            <View style={styles.finalHeader}>
              <Lightbulb size={22} color={Colors.success} />
              <Text style={styles.finalTitle}>Quick Reference Checklist</Text>
            </View>
            <View style={styles.checklistContent}>
              <Text style={styles.checklistItem}>☑ Write complete sentences, not fragments</Text>
              <Text style={styles.checklistItem}>☑ Use simple, clear language</Text>
              <Text style={styles.checklistItem}>☑ Avoid slang and abbreviations</Text>
              <Text style={styles.checklistItem}>☑ Provide context for ambiguous words</Text>
              <Text style={styles.checklistItem}>☑ Use active voice over passive voice</Text>
              <Text style={styles.checklistItem}>☑ Check spelling before translating</Text>
              <Text style={styles.checklistItem}>☑ Review results with native speakers</Text>
              <Text style={styles.checklistItem}>☑ Use the dictionary for individual words</Text>
              <Text style={styles.checklistItem}>☑ Save successful translations for reference</Text>
              <Text style={styles.checklistItem}>☑ Report errors to help improve the system</Text>
            </View>
          </GlassCard>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(tabs)');
              }}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.tertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Languages size={22} color={Colors.text} />
                <Text style={styles.ctaText}>Start Translating</Text>
                <ArrowRight size={20} color={Colors.text} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Have questions or suggestions? Visit our Contact page to reach the Zomi Translator team.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 14,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  introCard: {
    marginBottom: 20,
  },
  introText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  insightBox: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  insightGradient: {
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accent,
  },
  insightText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  highlightText: {
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  sectionContent: {
    gap: 12,
  },
  sectionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  examplesSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  examplesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  examplesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  exampleCard: {
    marginBottom: 12,
  },
  exampleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  exampleBad: {
    flex: 1,
    backgroundColor: 'rgba(255, 94, 94, 0.15)',
    borderRadius: 10,
    padding: 12,
  },
  exampleGood: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderRadius: 10,
    padding: 12,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  exampleBadText: {
    fontSize: 13,
    color: Colors.error,
    fontStyle: 'italic',
  },
  exampleGoodText: {
    fontSize: 13,
    color: Colors.success,
    fontStyle: 'italic',
  },
  exampleExplanation: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  factorsSection: {
    marginBottom: 20,
  },
  factorsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  factorsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  factorsCard: {
    gap: 0,
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  factorName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  factorImpact: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  mistakesSection: {
    marginBottom: 20,
  },
  mistakesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  mistakesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  mistakesCard: {
    gap: 10,
  },
  mistakeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mistakeBullet: {
    fontSize: 14,
    color: Colors.warning,
    fontWeight: '700',
  },
  mistakeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  practicesSection: {
    marginBottom: 20,
  },
  practicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  practicesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  practicesGrid: {
    gap: 12,
  },
  practiceCard: {
    padding: 16,
  },
  practiceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  practiceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  practiceDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  specialSection: {
    marginBottom: 20,
  },
  specialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  specialTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  specialContent: {
    gap: 8,
  },
  specialSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.tertiary,
    marginBottom: 4,
  },
  specialText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    gap: 12,
  },
  termEnglish: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  termArrow: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  termZomi: {
    fontSize: 14,
    color: Colors.tertiary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  finalTips: {
    marginBottom: 24,
  },
  finalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  finalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  checklistContent: {
    gap: 10,
  },
  checklistItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  ctaSection: {
    marginBottom: 20,
  },
  ctaButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  dictionaryVsSection: {
    marginBottom: 24,
    padding: 20,
  },
  dictionaryVsHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dictionaryVsIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  toolIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  dictionaryVsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  dictionaryVsSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  comparisonColumn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  comparisonDivider: {
    width: 2,
    backgroundColor: Colors.glassBorder,
    marginVertical: 10,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  comparisonHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  comparisonContent: {
    gap: 8,
    marginBottom: 14,
  },
  comparisonPoint: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  useCaseBox: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  useCaseTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  useCaseText: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 18,
  },
  technicalExplanation: {
    backgroundColor: 'rgba(140, 92, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(140, 92, 255, 0.2)',
    gap: 12,
  },
  technicalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.tertiary,
    marginBottom: 4,
  },
  technicalText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  technicalBold: {
    fontWeight: '700',
    color: Colors.text,
  },
  technicalHighlight: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    fontWeight: '600',
    marginTop: 4,
    fontStyle: 'italic',
  },
  bestPracticeBox: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  bestPracticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  bestPracticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
  },
  bestPracticeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  bestPracticeBold: {
    fontWeight: '700',
    color: Colors.text,
  },
  bestPracticeHighlight: {
    fontWeight: '700',
    color: Colors.success,
  },
});

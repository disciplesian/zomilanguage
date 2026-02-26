import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Wrench,
  FileText,
  BookOpen,
  BarChart3,
  Mic,
  ArrowLeftRight,
  Sparkles,
  Type,
  Hash,
  Clock,
  Zap,
  ChevronRight,
  Copy,
  Lightbulb,
  Upload,
  Languages,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useDocumentProcessor, ProcessedDocument } from '@/hooks/useDocumentProcessor';

import GlassCard from '@/components/GlassCard';
import Colors from '@/constants/colors';
import { SCRIPTURES } from '@/constants/scriptures';

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  route?: string;
  action?: () => void;
}

export default function ToolsScreen() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [comparisonText1, setComparisonText1] = useState('');
  const [comparisonText2, setComparisonText2] = useState('');
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [generatedFlashcards, setGeneratedFlashcards] = useState<{front: string; back: string}[]>([]);
  const [flashcardInput, setFlashcardInput] = useState('');
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [dailyScripture, setDailyScripture] = useState(() => {
    const randomIndex = Math.floor(Math.random() * SCRIPTURES.length);
    return SCRIPTURES[randomIndex];
  });
  const [processedDocument, setProcessedDocument] = useState<ProcessedDocument | null>(null);
  const [documentTranslation, setDocumentTranslation] = useState<string | null>(null);
  const [isTranslatingDocument, setIsTranslatingDocument] = useState(false);
  const [translationDirection, setTranslationDirection] = useState<'en-zomi' | 'zomi-en'>('en-zomi');
  
  const { pickDocument, pickImage, isProcessing: isDocProcessing, progress: docProgress, error: docError } = useDocumentProcessor();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const analyzeText = useCallback(async () => {
    if (!textInput.trim()) {
      Alert.alert('No Text', 'Please enter some text to analyze.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const text = textInput.trim();
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
      
      const wordFreq: Record<string, number> = {};
      words.forEach(word => {
        const normalized = word.toLowerCase().replace(/[^a-zA-Z\u1000-\u109F]/g, '');
        if (normalized) {
          wordFreq[normalized] = (wordFreq[normalized] || 0) + 1;
        }
      });
      
      const topWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
      const avgSentenceLength = words.length / sentences.length;

      setAnalysisResult({
        characters: text.length,
        charactersNoSpaces: text.replace(/\s/g, '').length,
        words: words.length,
        sentences: sentences.length,
        paragraphs: paragraphs.length,
        avgWordLength: avgWordLength.toFixed(1),
        avgSentenceLength: avgSentenceLength.toFixed(1),
        topWords,
        readingTime: Math.ceil(words.length / 200),
        speakingTime: Math.ceil(words.length / 150),
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze text.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [textInput]);

  const compareTexts = useCallback(async () => {
    if (!comparisonText1.trim() || !comparisonText2.trim()) {
      Alert.alert('Missing Text', 'Please enter both texts to compare.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await generateText({
        messages: [
          {
            role: 'user',
            content: `Compare these two translations (in Zomi/Tedim and/or English) and provide a brief analysis of differences in meaning, tone, and accuracy.

Context: The target language is Tedim Zomi (ISO 639-3: ctd).

Text 1: "${comparisonText1}"

Text 2: "${comparisonText2}"

Provide a concise comparison highlighting:
1. Semantic differences
2. Tone/register differences (Formal/Informal Tedim)
3. Which might be more accurate according to standard Tedim usage
Keep it brief and practical.`,
          },
        ],
      });

      setComparisonResult(result || 'Unable to compare texts.');
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Comparison error:', error);
      setComparisonResult('Error comparing texts. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [comparisonText1, comparisonText2]);

  const generateFlashcards = useCallback(async () => {
    if (!flashcardInput.trim()) {
      Alert.alert('No Input', 'Please enter words or phrases to generate flashcards.');
      return;
    }

    setIsGeneratingFlashcards(true);
    try {
      const result = await generateText({
        messages: [
          {
            role: 'user',
            content: `Generate flashcards for learning Zomi (Tedim dialect) - English vocabulary.
            
**CRITICAL:** Use ONLY Tedim dialect vocabulary. Do not use Paite/Mizo terms.

For each word/phrase provided, create a flashcard with the Zomi (Tedim) word on front and English translation on back (or vice versa if English is provided).

Input: "${flashcardInput}"

Return the flashcards in this exact JSON format (return ONLY the JSON array, no other text):
[{"front": "zomi word", "back": "english translation"}, ...]

Generate 5-10 useful flashcards based on the input.`,
          },
        ],
      });

      try {
        const jsonMatch = result?.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const cards = JSON.parse(jsonMatch[0]);
          setGeneratedFlashcards(cards);
        } else {
          throw new Error('Invalid format');
        }
      } catch {
        setGeneratedFlashcards([
          { front: flashcardInput, back: 'Translation pending...' }
        ]);
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Flashcard generation error:', error);
      Alert.alert('Error', 'Failed to generate flashcards.');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  }, [flashcardInput]);

  const copyFlashcards = useCallback(async () => {
    const text = generatedFlashcards
      .map((card, i) => `${i + 1}. ${card.front} = ${card.back}`)
      .join('\n');
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Flashcards copied to clipboard.');
  }, [generatedFlashcards]);

  const handlePickDocument = useCallback(async () => {
    const doc = await pickDocument();
    if (doc) {
      setProcessedDocument(doc);
      setDocumentTranslation(null);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [pickDocument]);

  const handlePickImage = useCallback(async () => {
    const doc = await pickImage(false);
    if (doc) {
      setProcessedDocument(doc);
      setDocumentTranslation(null);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [pickImage]);

  const translateDocument = useCallback(async () => {
    if (!processedDocument?.extractedText) {
      Alert.alert('No Text', 'Please upload a document with text first.');
      return;
    }

    setIsTranslatingDocument(true);
    try {
      const sourceLanguage = translationDirection === 'en-zomi' ? 'English' : 'Tedim Zomi (CTD)';
      const targetLanguage = translationDirection === 'en-zomi' ? 'Tedim Zomi (CTD)' : 'English';
      
      const result = await generateText({
        messages: [
          {
            role: 'user',
            content: `You are an expert Tedim Zomi (ISO 639-3: ctd) linguist and translator.

Task: Translate the following text from ${sourceLanguage} to ${targetLanguage}.

**ABSOLUTE DIALECT RULE:**
- Use EXCLUSIVELY the Tedim (CTD) dialect vocabulary and grammar.
- NEVER use words from Paite, Mizo (Lushai), Hakha Chin, Falam Chin, or any other Kuki-Chin dialect.
- Preserve the original formatting, paragraphs, and structure as much as possible.
- Return ONLY the translation, nothing else.

Text to translate:
${processedDocument.extractedText}`,
          },
        ],
      });

      setDocumentTranslation(result || 'Translation failed.');
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Document translation error:', error);
      Alert.alert('Error', 'Failed to translate document. Please try again.');
    } finally {
      setIsTranslatingDocument(false);
    }
  }, [processedDocument, translationDirection]);

  const copyDocumentTranslation = useCallback(async () => {
    if (documentTranslation) {
      await Clipboard.setStringAsync(documentTranslation);
      Alert.alert('Copied!', 'Translation copied to clipboard.');
    }
  }, [documentTranslation]);

  const clearDocument = useCallback(() => {
    setProcessedDocument(null);
    setDocumentTranslation(null);
  }, []);

  const primaryTools: ToolItem[] = [
    {
      id: 'document-translate',
      title: 'Document Translation',
      description: 'Translate documents, images & files',
      icon: <FileText size={24} color={Colors.text} />,
      color: Colors.glassPurple,
      action: () => setActiveSection(activeSection === 'document' ? null : 'document'),
    },
    {
      id: 'tips',
      title: 'Translation Tips & Guide',
      description: 'Learn how to get the best translations',
      icon: <Lightbulb size={24} color={Colors.text} />,
      color: Colors.glassYellow,
      route: '/translation-tips',
    },
    {
      id: 'pronunciation',
      title: 'Pronunciation Guide',
      description: 'Learn Zomi pronunciation with audio',
      icon: <Mic size={24} color={Colors.text} />,
      color: Colors.glassCyan,
      route: '/pronunciation-guide',
    },
  ];

  const analysisTools: ToolItem[] = [
    {
      id: 'text-stats',
      title: 'Text Statistics',
      description: 'Analyze word count, frequency & more',
      icon: <BarChart3 size={22} color={Colors.text} />,
      color: Colors.glassGreen,
      action: () => setActiveSection(activeSection === 'stats' ? null : 'stats'),
    },
    {
      id: 'compare',
      title: 'Translation Comparison',
      description: 'Compare two translations side-by-side',
      icon: <ArrowLeftRight size={22} color={Colors.text} />,
      color: Colors.glassYellow,
      action: () => setActiveSection(activeSection === 'compare' ? null : 'compare'),
    },
    {
      id: 'flashcards',
      title: 'Flashcard Generator',
      description: 'Create study flashcards from words',
      icon: <BookOpen size={22} color={Colors.text} />,
      color: Colors.glassPink,
      action: () => setActiveSection(activeSection === 'flashcards' ? null : 'flashcards'),
    },
  ];

  const quickTools: ToolItem[] = [
    {
      id: 'word-count',
      title: 'Quick Word Count',
      description: 'Instant character & word count',
      icon: <Type size={20} color={Colors.textSecondary} />,
      color: Colors.glass,
      action: () => setActiveSection(activeSection === 'quick-count' ? null : 'quick-count'),
    },

  ];

  const renderToolCard = (tool: ToolItem, large = false) => (
    <TouchableOpacity
      key={tool.id}
      style={[styles.toolCard, large && styles.toolCardLarge]}
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (tool.route) {
          router.push(tool.route as any);
        } else if (tool.action) {
          tool.action();
        }
      }}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[tool.color, 'rgba(255,255,255,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.toolCardGradient, large && styles.toolCardGradientLarge]}
      >
        <View style={styles.toolIconContainer}>
          {tool.icon}
        </View>
        <View style={styles.toolTextContainer}>
          <Text style={styles.toolTitle}>{tool.title}</Text>
          <Text style={styles.toolDescription}>{tool.description}</Text>
        </View>
        <ChevronRight size={20} color={Colors.textMuted} />
      </LinearGradient>
    </TouchableOpacity>
  );

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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.header}>
            <LinearGradient
              colors={['rgba(140, 92, 255, 0.5)', 'rgba(0, 240, 255, 0.5)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIcon}
            >
              <Wrench size={26} color={Colors.text} />
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>Tools & Utilities</Text>
              <Text style={styles.headerSubtitle}>Powerful translation tools</Text>
            </View>
          </View>

          <GlassCard variant="yellow" style={styles.scriptureCard}>
            <View style={styles.scriptureHeader}>
              <Text style={styles.scriptureTitle}>Daily Scripture</Text>
              <TouchableOpacity 
                onPress={() => {
                  const randomIndex = Math.floor(Math.random() * SCRIPTURES.length);
                  setDailyScripture(SCRIPTURES[randomIndex]);
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                }}
                style={styles.refreshButton}
              >
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.scriptureText}>{`\u201C${dailyScripture.verse}\u201D`}</Text>
            <Text style={styles.scriptureReference}>— {dailyScripture.reference}</Text>
          </GlassCard>

          <Text style={styles.sectionTitle}>Primary Tools</Text>
          <View style={styles.toolsGrid}>
            {primaryTools.map(tool => renderToolCard(tool, true))}
          </View>

          <Text style={styles.sectionTitle}>Analysis & Study</Text>
          <View style={styles.toolsList}>
            {analysisTools.map(tool => renderToolCard(tool))}
          </View>

          {activeSection === 'document' && (
            <GlassCard variant="purple" style={styles.expandedSection}>
              <Text style={styles.expandedTitle}>Document Translation</Text>
              <Text style={styles.docSubtitle}>Upload a document or image to extract and translate text</Text>
              
              {!processedDocument ? (
                <View style={styles.uploadContainer}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handlePickDocument}
                    disabled={isDocProcessing}
                  >
                    <LinearGradient
                      colors={[Colors.primary, Colors.secondary]}
                      style={styles.uploadButtonGradient}
                    >
                      {isDocProcessing ? (
                        <View style={styles.progressContainer}>
                          <ActivityIndicator color={Colors.text} size="small" />
                          <Text style={styles.uploadButtonText}>Processing... {docProgress}%</Text>
                        </View>
                      ) : (
                        <>
                          <Upload size={20} color={Colors.text} />
                          <Text style={styles.uploadButtonText}>Upload Document</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handlePickImage}
                    disabled={isDocProcessing}
                  >
                    <LinearGradient
                      colors={[Colors.accent, Colors.warning]}
                      style={styles.uploadButtonGradient}
                    >
                      <FileText size={20} color={Colors.text} />
                      <Text style={styles.uploadButtonText}>Upload Image</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <Text style={styles.supportedFormats}>
                    Supported: Images (JPG, PNG), Text files, CSV
                  </Text>
                </View>
              ) : (
                <View style={styles.documentResult}>
                  <View style={styles.docInfoRow}>
                    <View style={styles.docInfo}>
                      <FileText size={18} color={Colors.primary} />
                      <Text style={styles.docName} numberOfLines={1}>{processedDocument.name}</Text>
                    </View>
                    <TouchableOpacity onPress={clearDocument} style={styles.clearButton}>
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.extractedTextBox}>
                    <Text style={styles.extractedLabel}>Extracted Text:</Text>
                    <ScrollView style={styles.extractedScroll} nestedScrollEnabled>
                      <Text style={styles.extractedText}>
                        {processedDocument.extractedText || 'No text extracted'}
                      </Text>
                    </ScrollView>
                  </View>
                  
                  <View style={styles.directionSelector}>
                    <TouchableOpacity
                      style={[
                        styles.directionOption,
                        translationDirection === 'en-zomi' && styles.directionOptionActive,
                      ]}
                      onPress={() => setTranslationDirection('en-zomi')}
                    >
                      <Text style={[
                        styles.directionText,
                        translationDirection === 'en-zomi' && styles.directionTextActive,
                      ]}>English → Zomi</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.directionOption,
                        translationDirection === 'zomi-en' && styles.directionOptionActive,
                      ]}
                      onPress={() => setTranslationDirection('zomi-en')}
                    >
                      <Text style={[
                        styles.directionText,
                        translationDirection === 'zomi-en' && styles.directionTextActive,
                      ]}>Zomi → English</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.translateButton}
                    onPress={translateDocument}
                    disabled={isTranslatingDocument || !processedDocument.extractedText}
                  >
                    <LinearGradient
                      colors={[Colors.success, Colors.successLight]}
                      style={styles.translateButtonGradient}
                    >
                      {isTranslatingDocument ? (
                        <ActivityIndicator color={Colors.text} size="small" />
                      ) : (
                        <>
                          <Languages size={18} color={Colors.text} />
                          <Text style={styles.translateButtonText}>Translate Document</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  {documentTranslation && (
                    <View style={styles.translationResult}>
                      <View style={styles.translationHeader}>
                        <Text style={styles.translationLabel}>Translation:</Text>
                        <TouchableOpacity onPress={copyDocumentTranslation} style={styles.copyTranslation}>
                          <Copy size={16} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.translationScroll} nestedScrollEnabled>
                        <Text style={styles.translationText}>{documentTranslation}</Text>
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
              
              {docError && (
                <Text style={styles.errorText}>{docError}</Text>
              )}
            </GlassCard>
          )}

          {activeSection === 'stats' && (
            <GlassCard variant="green" style={styles.expandedSection}>
              <Text style={styles.expandedTitle}>Text Statistics Analyzer</Text>
              <TextInput
                style={styles.expandedInput}
                placeholder="Paste or type text to analyze..."
                placeholderTextColor={Colors.textMuted}
                value={textInput}
                onChangeText={setTextInput}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={analyzeText}
                disabled={isAnalyzing}
              >
                <LinearGradient
                  colors={[Colors.success, Colors.successLight]}
                  style={styles.analyzeButtonGradient}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator color={Colors.text} size="small" />
                  ) : (
                    <>
                      <Zap size={18} color={Colors.text} />
                      <Text style={styles.analyzeButtonText}>Analyze</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {analysisResult && (
                <View style={styles.statsResults}>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Hash size={16} color={Colors.accent} />
                      <Text style={styles.statValue}>{analysisResult.characters}</Text>
                      <Text style={styles.statLabel}>Characters</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Type size={16} color={Colors.primary} />
                      <Text style={styles.statValue}>{analysisResult.words}</Text>
                      <Text style={styles.statLabel}>Words</Text>
                    </View>
                    <View style={styles.statBox}>
                      <FileText size={16} color={Colors.success} />
                      <Text style={styles.statValue}>{analysisResult.sentences}</Text>
                      <Text style={styles.statLabel}>Sentences</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Clock size={16} color={Colors.warning} />
                      <Text style={styles.statValue}>{analysisResult.readingTime}m</Text>
                      <Text style={styles.statLabel}>Read Time</Text>
                    </View>
                  </View>

                  {analysisResult.topWords.length > 0 && (
                    <View style={styles.topWordsSection}>
                      <Text style={styles.topWordsTitle}>Top Words</Text>
                      <View style={styles.topWordsList}>
                        {analysisResult.topWords.map(([word, count]: [string, number], index: number) => (
                          <View key={index} style={styles.topWordItem}>
                            <Text style={styles.topWord}>{word}</Text>
                            <Text style={styles.topWordCount}>{count}x</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </GlassCard>
          )}

          {activeSection === 'compare' && (
            <GlassCard variant="yellow" style={styles.expandedSection}>
              <Text style={styles.expandedTitle}>Translation Comparison</Text>
              <Text style={styles.compareLabel}>Translation 1</Text>
              <TextInput
                style={styles.compareInput}
                placeholder="Enter first translation..."
                placeholderTextColor={Colors.textMuted}
                value={comparisonText1}
                onChangeText={setComparisonText1}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.compareLabel}>Translation 2</Text>
              <TextInput
                style={styles.compareInput}
                placeholder="Enter second translation..."
                placeholderTextColor={Colors.textMuted}
                value={comparisonText2}
                onChangeText={setComparisonText2}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={compareTexts}
                disabled={isAnalyzing}
              >
                <LinearGradient
                  colors={[Colors.warning, Colors.accent]}
                  style={styles.analyzeButtonGradient}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator color={Colors.text} size="small" />
                  ) : (
                    <>
                      <ArrowLeftRight size={18} color={Colors.text} />
                      <Text style={styles.analyzeButtonText}>Compare</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {comparisonResult && (
                <View style={styles.comparisonResult}>
                  <Text style={styles.comparisonResultText}>{comparisonResult}</Text>
                </View>
              )}
            </GlassCard>
          )}

          {activeSection === 'flashcards' && (
            <GlassCard variant="pink" style={styles.expandedSection}>
              <Text style={styles.expandedTitle}>Flashcard Generator</Text>
              <TextInput
                style={styles.expandedInput}
                placeholder="Enter words or phrases (one per line or comma-separated)..."
                placeholderTextColor={Colors.textMuted}
                value={flashcardInput}
                onChangeText={setFlashcardInput}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={generateFlashcards}
                disabled={isGeneratingFlashcards}
              >
                <LinearGradient
                  colors={[Colors.secondary, Colors.secondaryLight]}
                  style={styles.analyzeButtonGradient}
                >
                  {isGeneratingFlashcards ? (
                    <ActivityIndicator color={Colors.text} size="small" />
                  ) : (
                    <>
                      <Sparkles size={18} color={Colors.text} />
                      <Text style={styles.analyzeButtonText}>Generate Flashcards</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {generatedFlashcards.length > 0 && (
                <View style={styles.flashcardsContainer}>
                  <View style={styles.flashcardsHeader}>
                    <Text style={styles.flashcardsTitle}>Generated Flashcards</Text>
                    <TouchableOpacity onPress={copyFlashcards} style={styles.copyButton}>
                      <Copy size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {generatedFlashcards.map((card, index) => (
                    <View key={index} style={styles.flashcard}>
                      <View style={styles.flashcardFront}>
                        <Text style={styles.flashcardLabel}>Front</Text>
                        <Text style={styles.flashcardText}>{card.front}</Text>
                      </View>
                      <View style={styles.flashcardDivider} />
                      <View style={styles.flashcardBack}>
                        <Text style={styles.flashcardLabel}>Back</Text>
                        <Text style={styles.flashcardText}>{card.back}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </GlassCard>
          )}

          {activeSection === 'quick-count' && (
            <GlassCard style={styles.expandedSection}>
              <Text style={styles.expandedTitle}>Quick Word Count</Text>
              <TextInput
                style={styles.expandedInput}
                placeholder="Type or paste text..."
                placeholderTextColor={Colors.textMuted}
                value={textInput}
                onChangeText={setTextInput}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.quickCountResults}>
                <View style={styles.quickCountItem}>
                  <Text style={styles.quickCountValue}>{textInput.length}</Text>
                  <Text style={styles.quickCountLabel}>Characters</Text>
                </View>
                <View style={styles.quickCountItem}>
                  <Text style={styles.quickCountValue}>
                    {textInput.trim() ? textInput.trim().split(/\s+/).length : 0}
                  </Text>
                  <Text style={styles.quickCountLabel}>Words</Text>
                </View>
                <View style={styles.quickCountItem}>
                  <Text style={styles.quickCountValue}>
                    {textInput.trim() ? textInput.trim().split(/[.!?]+/).filter(s => s.trim()).length : 0}
                  </Text>
                  <Text style={styles.quickCountLabel}>Sentences</Text>
                </View>
              </View>
            </GlassCard>
          )}

          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.toolsList}>
            {quickTools.map(tool => renderToolCard(tool))}
          </View>

          <GlassCard style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Sparkles size={18} color={Colors.accent} />
              <Text style={styles.tipsTitle}>Pro Tips</Text>
            </View>
            <View style={styles.tipsList}>
              <Text style={styles.tipItem}>• Compare translations to find the most accurate version</Text>
              <Text style={styles.tipItem}>• Generate flashcards to improve vocabulary retention</Text>
              <Text style={styles.tipItem}>• Text statistics help analyze writing complexity</Text>
            </View>
          </GlassCard>
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
    marginBottom: 28,
    gap: 14,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 14,
    marginTop: 8,
  },
  toolsGrid: {
    gap: 12,
    marginBottom: 8,
  },
  toolsList: {
    gap: 10,
    marginBottom: 8,
  },
  toolCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  toolCardLarge: {
    borderRadius: 16,
  },
  toolCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  toolCardGradientLarge: {
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  toolIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTextContainer: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  toolDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expandedSection: {
    marginTop: 12,
    marginBottom: 16,
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 14,
  },
  expandedInput: {
    minHeight: 100,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 12,
  },
  analyzeButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  analyzeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  statsResults: {
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  topWordsSection: {
    marginTop: 16,
  },
  topWordsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  topWordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topWordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  topWord: {
    fontSize: 13,
    color: Colors.text,
  },
  topWordCount: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  compareLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  compareInput: {
    minHeight: 70,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 12,
  },
  comparisonResult: {
    marginTop: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
  },
  comparisonResultText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  flashcardsContainer: {
    marginTop: 16,
  },
  flashcardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  flashcardsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  copyButton: {
    padding: 8,
  },
  flashcard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  flashcardFront: {
    padding: 12,
  },
  flashcardBack: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  flashcardDivider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
  },
  flashcardLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  flashcardText: {
    fontSize: 15,
    color: Colors.text,
  },
  quickCountResults: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  quickCountItem: {
    alignItems: 'center',
  },
  quickCountValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
  },
  quickCountLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tipsCard: {
    marginTop: 16,
  },
  docSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  uploadContainer: {
    gap: 12,
  },
  uploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supportedFormats: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  documentResult: {
    gap: 14,
  },
  docInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  extractedTextBox: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    maxHeight: 120,
  },
  extractedLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  extractedScroll: {
    maxHeight: 80,
  },
  extractedText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  directionSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  directionOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  directionOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(140, 92, 255, 0.15)',
  },
  directionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  directionTextActive: {
    color: Colors.primary,
  },
  translateButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  translateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  translateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  translationResult: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    maxHeight: 150,
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  translationLabel: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  copyTranslation: {
    padding: 4,
  },
  translationScroll: {
    maxHeight: 100,
  },
  translationText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  scriptureCard: {
    marginBottom: 20,
  },
  scriptureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scriptureTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
    borderRadius: 12,
  },
  refreshText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },
  scriptureText: {
    fontSize: 16,
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 8,
  },
  scriptureReference: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    textAlign: 'right',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

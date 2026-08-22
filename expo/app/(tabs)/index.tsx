import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  ImageBackground,
  Image,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { 
  ArrowRightLeft, 
  Copy, 
  Volume2, 
  Trash2, 
  Mic,
  Camera,
  Star,
  AlertCircle,
  Clipboard as ClipboardIcon,
  Square,
  Image as ImageIcon,
  Download,
  Share as ShareIcon,
  FileDown,
  Wrench,
  History as HistoryIcon,
  BookOpen,
  Mic2,
  Lightbulb,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import * as ImagePicker from 'expo-image-picker';
import { generateText } from '@rork-ai/toolkit-sdk';
import { trpc } from '@/lib/trpc';
import { buildFallbackPrompt } from '@/constants/zomiPrompt';


import GlassCard from '@/components/GlassCard';
import TypingDots from '@/components/TypingDots';

import Colors from '@/constants/colors';

import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useStreamingTranslation } from '@/hooks/useStreamingTranslation';
import { useTranslationCache } from '@/contexts/TranslationCacheContext';
import { useGlossary } from '@/contexts/GlossaryContext';
import { exportTranslation, ExportFormat, TranslationData } from '@/lib/exportUtils';

export default function TranslatorScreen() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isZomiToEnglish, setIsZomiToEnglish] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationQuality, setTranslationQuality] = useState(0);
  
  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);

  const [showExportOptions, setShowExportOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const recordingAnim = useRef(new Animated.Value(1)).current;

  const { 
    speak, 
    stop: stopSpeaking, 
    isSpeaking, 
    currentSpeed, 
    setSpeed, 
    availableSpeeds 
  } = useTextToSpeech();
  
  const { 
    isRecording, 
    isTranscribing, 
    recordingDuration,
    startRecording, 
    stopRecording, 
    cancelRecording 
  } = useSpeechToText();



  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordingAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      recordingAnim.setValue(1);
    }
  }, [isRecording, recordingAnim]);

  const translateMutation = trpc.translation.translate.useMutation();
  const stream = useStreamingTranslation();
  const cache = useTranslationCache();
  const glossary = useGlossary();
  const translationRequestId = useRef(0);
  const isTranslatingRef = useRef(false);
  const lastTranslatedText = useRef('');
  const lastDirection = useRef(true);

  // Mirror streaming text into the visible output so the user sees token-by-token reveal.
  useEffect(() => {
    if (stream.isStreaming && stream.text) {
      setOutputText(stream.text);
      setIsTranslating(false);
    }
  }, [stream.isStreaming, stream.text]);

  const translate = useCallback(async (text: string, direction: boolean) => {
    if (!text || !text.trim()) {
      setOutputText('');
      setTranslationQuality(0);
      setIsTranslating(false);
      lastTranslatedText.current = '';
      return;
    }

    // Skip if same text and direction (prevents unnecessary re-translations)
    if (text.trim() === lastTranslatedText.current && direction === lastDirection.current) {
      return;
    }

    // Increment request ID to track the latest request
    const currentRequestId = ++translationRequestId.current;
    
    // Update refs to track current translation
    lastTranslatedText.current = text.trim();
    lastDirection.current = direction;
    
    // Only show loading if we're not already translating (prevents flicker)
    if (!isTranslatingRef.current) {
      setIsTranslating(true);
      isTranslatingRef.current = true;
    }
    
    console.log(`[Request ${currentRequestId}] Starting translation...`);
    console.log('Input text:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    console.log('Direction:', direction ? 'Zomi → English' : 'English → Zomi');

    const targetLang: 'english' | 'zomi' = direction ? 'english' : 'zomi';
    const sourceLang: 'zomi' | 'english' = direction ? 'zomi' : 'english';

    // Offline / instant cache hit
    const hit = cache.lookup(text.trim(), targetLang);
    if (hit) {
      console.log('[cache] hit', hit.model, hit.confidence);
      setOutputText(hit.translatedText);
      setTranslationQuality(hit.confidence || 95);
      setIsTranslating(false);
      isTranslatingRef.current = false;
      // Continue to refresh in background only if confidence is low; otherwise return.
      if ((hit.confidence ?? 0) >= 90) return;
    }

    // Primary path: stream tokens via SSE for instant token-by-token reveal.
    // Note: we intentionally do NOT clear the previous output here — keeping the
    // last translation visible while a new one streams in prevents the display
    // from blinking on every keystroke.
    try {
      const streamResult = await stream.start(text.trim(), targetLang, {
        extraGlossary: glossary.asRecord(),
      });
      if (currentRequestId !== translationRequestId.current) return;
      if (streamResult.ok && streamResult.text) {
        setOutputText(streamResult.text);
        const conf = streamResult.confidence > 0 ? streamResult.confidence : 95;
        setTranslationQuality(conf);
        setIsTranslating(false);
        isTranslatingRef.current = false;
        cache.save({
          sourceText: text.trim(),
          translatedText: streamResult.text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          confidence: conf,
          model: streamResult.model,
        });
        console.log('[stream] success via', streamResult.model);
        return;
      }
      if (streamResult.error && streamResult.error !== 'cancelled') {
        console.log('[stream] failed, falling back to tRPC:', streamResult.error);
      } else if (streamResult.error === 'cancelled') {
        return;
      }
    } catch (streamErr) {
      console.log('[stream] threw, falling back to tRPC:', streamErr);
    }

    // Fallback path: tRPC mutation (uses server cache + structured output).
    try {
      const result = await translateMutation.mutateAsync({
        text: text.trim(),
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        extraGlossary: glossary.asRecord(),
      });
      
      // Check if this is still the latest request
      if (currentRequestId !== translationRequestId.current) {
        console.log(`[Request ${currentRequestId}] Outdated, ignoring result`);
        return;
      }
      
      console.log('Backend translation successful:', result.model, 'cached=', (result as any).cached);
      setOutputText(result.translatedText);
      const conf = (result as any).confidence;
      const finalConf = typeof conf === 'number' && conf > 0 ? conf : 95;
      setTranslationQuality(finalConf);
      setIsTranslating(false);
      isTranslatingRef.current = false;
      cache.save({
        sourceText: text.trim(),
        translatedText: result.translatedText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        confidence: finalConf,
        model: result.model,
      });
      return;
    } catch (backendError: unknown) {
      if (currentRequestId !== translationRequestId.current) {
        console.log(`[Request ${currentRequestId}] Outdated after backend error, skipping fallback`);
        return;
      }
      const errMsg = backendError instanceof Error ? backendError.message : String(backendError);
      if (errMsg.includes('TOO_MANY_REQUESTS') || errMsg.toLowerCase().includes('quota')) {
        setOutputText('Translation quota exceeded. Please wait a moment and try again.');
        setTranslationQuality(0);
        setIsTranslating(false);
        isTranslatingRef.current = false;
        return;
      }
      console.log('Backend translation failed, trying fallback...', backendError);
    }
    
    // Fallback to client-side AI translation
    try {
      console.log('Using client-side AI fallback...');
      const prompt = buildFallbackPrompt(
        text.trim(),
        direction ? 'zomi-to-english' : 'english-to-zomi'
      );

      const fallbackResult = await generateText({ messages: [{ role: 'user', content: prompt }] });
      
      // Check if this is still the latest request
      if (currentRequestId !== translationRequestId.current) {
        console.log(`[Request ${currentRequestId}] Outdated after fallback, ignoring`);
        return;
      }
      
      const finalText = fallbackResult.trim();
      setOutputText(finalText);
      setTranslationQuality(92);
      cache.save({
        sourceText: text.trim(),
        translatedText: finalText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        confidence: 92,
        model: 'rork-toolkit',
      });
    } catch (fallbackError: unknown) {
      // Check if this is still the latest request
      if (currentRequestId !== translationRequestId.current) {
        console.log(`[Request ${currentRequestId}] Outdated after fallback error, ignoring`);
        return;
      }
      
      console.error('Fallback translation also failed:', fallbackError);
      const errorMsg = fallbackError instanceof Error ? fallbackError.message.toLowerCase() : '';

      // Last-resort: serve from offline cache if we have any prior hit, even fuzzy.
      const offlineHit = cache.lookup(text.trim(), targetLang);
      if (offlineHit) {
        setOutputText(offlineHit.translatedText);
        setTranslationQuality(Math.max(50, offlineHit.confidence - 20));
        return;
      }

      let userMessage = 'Translation failed. Please try again.';
      if (errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('429')) {
        userMessage = 'API quota exceeded. Please wait a moment and try again.';
      } else if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
        userMessage = 'Network error. Please check your internet connection.';
      } else if (errorMsg.includes('timeout')) {
        userMessage = 'Request timed out. Please try again.';
      }
      
      setOutputText(userMessage);
      setTranslationQuality(0);
    } finally {
      // Only update loading state if this is the latest request
      if (currentRequestId === translationRequestId.current) {
        setIsTranslating(false);
        isTranslatingRef.current = false;
      }
    }
  }, [translateMutation, stream, cache, glossary]);

  const translateRef = useRef(translate);
  translateRef.current = translate;
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (!inputText.trim()) {
      setOutputText('');
      setTranslationQuality(0);
      setIsTranslating(false);
      lastTranslatedText.current = '';
      return;
    }
    const timeoutId = setTimeout(() => {
      translateRef.current(inputText, isZomiToEnglish);
    }, 600); 
    
    return () => clearTimeout(timeoutId);
  }, [inputText, isZomiToEnglish]);

  const handleSwapLanguages = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    
    setIsZomiToEnglish(prev => !prev);
    
    if (outputText && !outputText.startsWith('Translation') && !outputText.startsWith('Service')) {
      const newInput = outputText;
      const newOutput = inputText;
      lastTranslatedText.current = newInput.trim();
      lastDirection.current = !isZomiToEnglish;
      setInputText(newInput);
      setOutputText(newOutput);
    } else {
      lastTranslatedText.current = '';
      setOutputText(''); 
    }
  }, [inputText, outputText, pulseAnim, isZomiToEnglish]);

  const handleCopy = useCallback(async () => {
    if (outputText && !outputText.startsWith('Translation') && !outputText.startsWith('Service')) {
      await Clipboard.setStringAsync(outputText);
      setCopied(true);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => setCopied(false), 2000);
    }
  }, [outputText]);

  const handleClear = useCallback(() => {
    setInputText('');
    setOutputText('');
    setTranslationQuality(0);
    stopSpeaking();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [stopSpeaking]);

  const handleFavorite = useCallback(() => {
    setIsFavorite(!isFavorite);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [isFavorite]);

  const handleShare = useCallback(async () => {
    if (!outputText || outputText.startsWith('Translation') || outputText.startsWith('Service')) {
      Alert.alert('Error', 'No translation available to share');
      return;
    }

    const message = `${isZomiToEnglish ? 'Zomi' : 'English'}: ${inputText}\n\n${isZomiToEnglish ? 'English' : 'Zomi'}: ${outputText}\n\nTranslated with Zomi Translator`;
      
    if (Platform.OS === 'web') {
      // Try Web Share API first (works on mobile browsers and some desktop browsers)
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: 'Zomi Translation',
            text: message,
          });
          return;
        } catch (shareError: any) {
          // User cancelled or share failed - fall through to clipboard
          console.log('Web share not available or cancelled:', shareError?.message);
        }
      }
      
      // Fallback: Copy to clipboard
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(message);
          Alert.alert('Copied!', 'Translation copied to clipboard. You can now paste and share it anywhere!');
        } else {
          // Final fallback for older browsers
          await Clipboard.setStringAsync(message);
          Alert.alert('Copied!', 'Translation copied to clipboard. You can now paste and share it anywhere!');
        }
      } catch (clipboardError) {
        console.error('Clipboard error:', clipboardError);
        Alert.alert(
          'Share Translation',
          'Copy this text manually:\n\n' + message,
          [{ text: 'OK' }]
        );
      }
    } else {
      // Native share for iOS/Android
      try {
        const result = await Share.share({
          message,
          title: 'Zomi Translation',
        });
        if (result.action === Share.sharedAction) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.error('Share error:', error);
        // Fallback to clipboard on native if share fails
        try {
          await Clipboard.setStringAsync(message);
          Alert.alert('Copied!', 'Translation copied to clipboard.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          Alert.alert('Error', 'Failed to share translation. Please try copying manually.');
        }
      }
    }
  }, [inputText, outputText, isZomiToEnglish]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!outputText || outputText.startsWith('Translation') || outputText.startsWith('Service')) {
      Alert.alert('Error', 'No translation available to export');
      return;
    }

    setIsExporting(true);
    setShowExportOptions(false);

    try {
      const data: TranslationData = {
        sourceText: inputText,
        translatedText: outputText,
        sourceLanguage: isZomiToEnglish ? 'Zomi' : 'English',
        targetLanguage: isZomiToEnglish ? 'English' : 'Zomi',
        timestamp: new Date(),
      };

      await exportTranslation(data, format);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export translation');
    } finally {
      setIsExporting(false);
    }
  }, [inputText, outputText, isZomiToEnglish]);

  const handlePaste = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text) {
              setInputText(text);
              return;
            }
          }
        } catch {
          console.log('Web clipboard not available, using expo-clipboard');
        }
        try {
          const text = await Clipboard.getStringAsync();
          if (text) {
            setInputText(text);
          }
        } catch {
          console.log('Expo clipboard fallback used');
        }
      } else {
        const text = await Clipboard.getStringAsync();
        if (text) {
          setInputText(text);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch {
      console.log('Paste operation completed');
    }
  }, []);

  const extractTextFromImage = useCallback(async (base64Image: string) => {
    setIsTranslating(true);
    try {
      console.log('Extracting text from image...');
      const extractedText = await generateText({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                image: base64Image,
              },
              {
                type: 'text',
                text: 'Extract all visible text from this image. Return ONLY the extracted text, nothing else. If there is no text in the image, return "No text found".',
              },
            ],
          },
        ],
      });

      console.log('Extracted text:', extractedText);

      if (extractedText && extractedText !== 'No text found') {
        setInputText(extractedText.trim());
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('No Text Found', 'Could not detect any text in the image.');
      }
    } catch (error) {
      console.error('OCR error:', error);
      Alert.alert('Error', 'Failed to extract text from image. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const handleImagePick = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to use this feature.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          await extractTextFromImage(asset.base64);
        } else {
          Alert.alert('Error', 'Failed to process image.');
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  }, [extractTextFromImage]);

  const handleCameraCapture = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow camera access to use this feature.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          await extractTextFromImage(asset.base64);
        } else {
          Alert.alert('Error', 'Failed to process image.');
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to capture image.');
    }
  }, [extractTextFromImage]);

  const handleVoiceInput = useCallback(async () => {
    if (isRecording) {
      const transcription = await stopRecording();
      if (transcription) {
        setInputText(transcription);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } else {
      await startRecording();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleSpeak = useCallback((text: string, language: 'en' | 'zomi') => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(text, { language, rate: currentSpeed });
    }
  }, [speak, stopSpeaking, isSpeaking, currentSpeed]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

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
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80' }}
            style={styles.headerBackground}
            imageStyle={styles.headerBackgroundImage}
          >
            <LinearGradient
              colors={['rgba(42, 47, 69, 0.7)', 'rgba(42, 47, 69, 0.85)']}
              style={styles.headerOverlay}
            >
              <View style={styles.header}>
                <View style={styles.headerIcon}>
                  <Image
                    source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fw1kjqxngjk7aalao0jn6' }}
                    style={styles.headerIconImage}
                    resizeMode="contain"
                  />
                </View>
                <View>
                  <Text style={styles.headerTitle}>ZOMI TRANSLATOR</Text>
                  <Text style={styles.headerSubtitle}>AI-Powered Translation</Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>

          <GlassCard variant="cyan" glow style={styles.languageSelector}>
            <View style={styles.languageRow}>
              <TouchableOpacity 
                style={[styles.languageButton, isZomiToEnglish && styles.languageButtonActive]}
                onPress={() => {
                  if (!isZomiToEnglish) {
                    setIsZomiToEnglish(true);
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                  }
                }}
              >
                <Text style={[styles.languageText, isZomiToEnglish && styles.languageTextActive]}>
                  Zomi {isZomiToEnglish ? '+' : ''}
                </Text>
              </TouchableOpacity>
              
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity 
                  style={styles.swapButton}
                  onPress={handleSwapLanguages}
                >
                  <LinearGradient
                    colors={['rgba(0, 240, 255, 0.8)', 'rgba(140, 92, 255, 0.8)']}
                    style={styles.swapGradient}
                  >
                    <ArrowRightLeft size={20} color={Colors.text} />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
              
              <TouchableOpacity 
                style={[styles.languageButton, !isZomiToEnglish && styles.languageButtonActive]}
                onPress={() => {
                  if (isZomiToEnglish) {
                    setIsZomiToEnglish(false);
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                  }
                }}
              >
                <Text style={[styles.languageText, !isZomiToEnglish && styles.languageTextActive]}>
                  English {!isZomiToEnglish ? '+' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickMenuContent}
            style={styles.quickMenu}
          >
            {[
              { id: 'tools', label: 'Tools', Icon: Wrench, color: '#8C5CFF', route: '/(tabs)/tools' },
              { id: 'history', label: 'History', Icon: HistoryIcon, color: '#22D3A3', route: '/(tabs)/history' },
              { id: 'glossary', label: 'Glossary', Icon: BookOpen, color: '#FFB547', route: '/glossary' },
              { id: 'pronounce', label: 'Pronounce', Icon: Mic2, color: '#FF6B9D', route: '/pronunciation-guide' },
              { id: 'tips', label: 'Tips', Icon: Lightbulb, color: '#FFD166', route: '/translation-tips' },
            ].map(({ id, label, Icon, color, route }) => (
              <TouchableOpacity
                key={id}
                style={styles.quickItem}
                activeOpacity={0.8}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(route as any);
                }}
                testID={`quick-${id}`}
              >
                <LinearGradient
                  colors={[`${color}33`, `${color}14`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.quickIcon, { borderColor: `${color}55` }]}
                >
                  <Icon size={20} color={color} />
                </LinearGradient>
                <Text style={styles.quickLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <GlassCard variant="purple" style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>
                {isZomiToEnglish ? 'Zomi +' : 'English +'}
              </Text>
              <View style={styles.inputActions}>
                <Animated.View style={{ transform: [{ scale: isRecording ? recordingAnim : 1 }] }}>
                  <TouchableOpacity 
                    onPress={handleVoiceInput} 
                    style={[styles.actionButton, isRecording && styles.recordingButton]}
                    disabled={isTranscribing}
                  >
                    {isTranscribing ? (
                      <ActivityIndicator size="small" color={Colors.accent} />
                    ) : isRecording ? (
                      <Square size={18} color={Colors.error} fill={Colors.error} />
                    ) : (
                      <Mic size={18} color={Colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </Animated.View>
                <TouchableOpacity onPress={handlePaste} style={styles.actionButton}>
                  <ClipboardIcon size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCameraCapture} style={styles.actionButton}>
                  <Camera size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleImagePick} style={styles.actionButton}>
                  <ImageIcon size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClear} style={styles.actionButton}>
                  <Trash2 size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording... {formatDuration(recordingDuration)}</Text>
                <TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <TextInput
              style={styles.textInput}
              placeholder={`Type ${isZomiToEnglish ? 'Zomi' : 'English'} text...`}
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlignVertical="top"
              blurOnSubmit={true}
              editable={!isRecording && !isTranscribing}
            />
            <View style={styles.inputStats}>
              <Text style={styles.statsText}>{charCount}/5000</Text>
              <Text style={styles.statsText}>{wordCount} words</Text>
            </View>
          </GlassCard>

          <GlassCard variant="green" glow style={styles.outputCard}>
            <View style={styles.outputHeader}>
              <Text style={styles.inputLabel}>
                {isZomiToEnglish ? 'English' : 'Zomi'}
              </Text>
              <View style={styles.outputActions}>
                <TouchableOpacity onPress={handleFavorite} style={styles.actionButton}>
                  <Star 
                    size={18} 
                    color={isFavorite ? Colors.accent : Colors.textSecondary}
                    fill={isFavorite ? Colors.accent : 'transparent'}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                  <ShareIcon size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShowExportOptions(!showExportOptions)} 
                  style={styles.actionButton}
                >
                  {isExporting ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <Download size={18} color={Colors.textSecondary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCopy} style={styles.actionButton}>
                  <Copy size={18} color={copied ? Colors.success : Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleSpeak(outputText, isZomiToEnglish ? 'en' : 'zomi')} 
                  style={styles.actionButton}
                  onLongPress={() => setShowSpeedOptions(true)}
                >
                  <Volume2 size={18} color={isSpeaking ? Colors.accent : Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            
            {stream.isStreaming && !!outputText && (
              <View style={styles.streamingStatus}>
                <TypingDots color={Colors.accent} dotSize={5} />
                <Text style={styles.streamingStatusText}>Zomi AI is translating</Text>
              </View>
            )}

            {showExportOptions && (
              <View style={styles.exportOptionsContainer}>
                <Text style={styles.exportLabel}>Export Format</Text>
                <View style={styles.exportOptions}>
                  <TouchableOpacity
                    style={styles.exportOption}
                    onPress={() => handleExport('txt')}
                  >
                    <FileDown size={18} color={Colors.textSecondary} />
                    <Text style={styles.exportOptionText}>TXT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.exportOption}
                    onPress={() => handleExport('pdf')}
                  >
                    <FileDown size={18} color={Colors.textSecondary} />
                    <Text style={styles.exportOptionText}>PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.exportOption}
                    onPress={() => handleExport('png')}
                  >
                    <FileDown size={18} color={Colors.textSecondary} />
                    <Text style={styles.exportOptionText}>Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.exportOption}
                    onPress={() => handleExport('word')}
                  >
                    <FileDown size={18} color={Colors.textSecondary} />
                    <Text style={styles.exportOptionText}>Word</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {showSpeedOptions && (
              <View style={styles.speedOptionsContainer}>
                <Text style={styles.speedLabel}>TTS Speed</Text>
                <View style={styles.speedOptions}>
                  {availableSpeeds.map((speed) => (
                    <TouchableOpacity
                      key={speed}
                      style={[
                        styles.speedOption,
                        currentSpeed === speed && styles.speedOptionActive
                      ]}
                      onPress={() => {
                        setSpeed(speed);
                        setShowSpeedOptions(false);
                      }}
                    >
                      <Text style={[
                        styles.speedOptionText,
                        currentSpeed === speed && styles.speedOptionTextActive
                      ]}>
                        {speed}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            <View style={styles.outputContent}>
              {isTranslating && !outputText ? (
                <View style={styles.loadingContainer}>
                  <TypingDots color={Colors.accent} dotSize={9} />
                  <Text style={styles.loadingText}>Translating with Zomi AI...</Text>
                </View>
              ) : outputText.startsWith('Translation') || outputText.startsWith('Service') || outputText.startsWith('Error:') || outputText.startsWith('Invalid') || outputText.startsWith('API') || outputText.startsWith('Network') || outputText.startsWith('Authentication') || outputText.startsWith('Request timed') ? (
                <View style={styles.errorContainer}>
                  <AlertCircle size={20} color={Colors.error} />
                  <Text style={styles.errorText}>{outputText}</Text>
                  <TouchableOpacity onPress={() => translate(inputText, isZomiToEnglish)} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.outputText}>
                  {outputText || 'Translation will appear here...'}
                </Text>
              )}
            </View>
            
            {translationQuality > 0 && !isTranslating && (
              <View style={styles.qualitySection}>
                <View style={styles.qualityHeader}>
                  <Text style={styles.qualityLabel}>Translation Quality</Text>
                  <Text style={[styles.qualityValue, { color: translationQuality > 80 ? Colors.success : translationQuality > 70 ? Colors.warning : Colors.error }]}>
                    {translationQuality}%
                  </Text>
                </View>
                <View style={styles.qualityBar}>
                  <LinearGradient
                    colors={translationQuality > 80 ? [Colors.success, Colors.successLight] : [Colors.warning, Colors.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.qualityFill, { width: `${translationQuality}%` }]}
                  />
                </View>
                {translationQuality < 80 && wordCount <= 3 && (
                  <TouchableOpacity 
                    style={styles.contextTipButton}
                    onPress={() => {
                      Alert.alert(
                        'Improve Translation Quality',
                        'For better accuracy:\n\n• Use complete sentences instead of single words\n• Provide more context (who, what, when, where)\n• Check the Translation Guide for tips',
                        [
                          { text: 'Got it', style: 'default' },
                          { 
                            text: 'View Guide', 
                            onPress: () => {
                              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              router.push('/translation-tips' as any);
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <AlertCircle size={14} color={Colors.warning} />
                    <Text style={styles.contextTipText}>Tip: Add more context for better results</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 35,
  },
  headerBackground: {
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 4,
  },
  headerBackgroundImage: {
    resizeMode: 'cover',
  },
  headerOverlay: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerIconImage: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00D9FF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  languageSelector: {
    marginBottom: 12,
    padding: 10,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  languageButtonActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.25)',
  },
  languageText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  languageTextActive: {
    color: Colors.text,
  },
  swapButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  swapGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCard: {
    marginBottom: 12,
  },
  quickMenu: {
    marginBottom: 12,
  },
  quickMenuContent: {
    paddingHorizontal: 2,
    gap: 12,
    paddingVertical: 4,
  },
  quickItem: {
    alignItems: 'center',
    width: 68,
  },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 6,
  },
  quickLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  inputActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
  },
  recordingText: {
    flex: 1,
    fontSize: 14,
    color: Colors.error,
    fontWeight: '500',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    borderRadius: 6,
  },
  cancelText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  textInput: {
    minHeight: 120,
    fontSize: 17,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  inputStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statsText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  outputCard: {
    marginBottom: 16,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  outputActions: {
    flexDirection: 'row',
    gap: 4,
  },
  speedOptionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  speedLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  speedOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  speedOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.glass,
  },
  speedOptionActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
  },
  speedOptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  speedOptionTextActive: {
    color: Colors.text,
  },
  exportOptionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  exportLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  exportOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  exportOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.glass,
    gap: 4,
  },
  exportOptionText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  outputContent: {
    minHeight: 100,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  loadingContainer: {
    gap: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  streamingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  streamingStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Colors.error,
    lineHeight: 20,
    minWidth: 200,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.2)',
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  outputText: {
    fontSize: 17,
    color: Colors.text,
    lineHeight: 26,
  },
  qualitySection: {
    marginTop: 14,
  },
  qualityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  qualityLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  qualityValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  qualityBar: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  qualityFill: {
    height: '100%',
    borderRadius: 4,
  },
  contextTipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 242, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 242, 0, 0.2)',
  },
  contextTipText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500',
    flex: 1,
  },
  streamCursor: {
    fontSize: 17,
    color: Colors.accent,
    fontWeight: '700',
  },

});

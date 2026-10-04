import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  BadgeCheck,
  Check,
  CloudOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import * as ImagePicker from 'expo-image-picker';
import { generateText } from '@rork-ai/toolkit-sdk';
import { trpc } from '@/lib/trpc';
import { buildFallbackPrompt } from '@/constants/zomiPrompt';
import {
  languageLabel,
  languageTtsCode,
} from '@/constants/languages';
import { offlineLookup, OFFLINE_ENTRY_COUNT } from '@/constants/offlineDictionary';


import GlassCard from '@/components/GlassCard';
import TypingDots from '@/components/TypingDots';

import Colors from '@/constants/colors';

import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useStreamingTranslation } from '@/hooks/useStreamingTranslation';
import { useTranslationCache } from '@/contexts/TranslationCacheContext';
import { useGlossary } from '@/contexts/GlossaryContext';
import { useAuth } from '@/contexts/AuthContext';
import { getAnonymousId } from '@/lib/anonymousId';
import { exportTranslation, ExportFormat, TranslationData } from '@/lib/exportUtils';
import { createShareLink } from '@/lib/share';

export default function TranslatorScreen() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<'zomi' | 'english'>('zomi');
  const [targetLanguage, setTargetLanguage] = useState('english');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationQuality, setTranslationQuality] = useState(0);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [isOfflineResult, setIsOfflineResult] = useState(false);
  const [offlineNote, setOfflineNote] = useState<string | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);

  const [showExportOptions, setShowExportOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const recordingAnim = useRef(new Animated.Value(1)).current;
  const resultAnim = useRef(new Animated.Value(1)).current;
  const resultSlide = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslate = useRef(new Animated.Value(16)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Slide the toast in, hold briefly, then fade it out. */
  const showToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(toastTranslate, {
        toValue: 0,
        speed: 20,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        toastTranslate.setValue(16);
      });
    }, 1800);
  }, [toastOpacity, toastTranslate]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

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
  const { user, getAccessToken } = useAuth();
  const translationRequestId = useRef(0);
  const isTranslatingRef = useRef(false);
  const lastTranslatedText = useRef('');
  const lastDirection = useRef('zomi→english');

  const sourceLabel = sourceLanguage === 'zomi' ? 'Zomi' : 'English';
  const targetLabel = languageLabel(targetLanguage);

  // Mirror streaming text into the visible output so the user sees token-by-token reveal.
  useEffect(() => {
    if (stream.isStreaming && stream.text) {
      setOutputText(stream.text);
      setIsTranslating(false);
    }
  }, [stream.isStreaming, stream.text]);

  // Fade-in + slide-up whenever a finished translation result appears.
  useEffect(() => {
    const finished = !!outputText && !isTranslating && !stream.isStreaming;
    if (!finished) return;
    resultAnim.setValue(0);
    resultSlide.setValue(24);
    Animated.parallel([
      Animated.timing(resultAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(resultSlide, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [outputText, isTranslating, stream.isStreaming, resultAnim, resultSlide]);

  // Segments of the output that came from the user's personal glossary.
  const glossarySegments = useMemo(() => {
    const isError = /^(Translation|Service|Error:|Invalid|API|Network|Authentication|Request timed|Sign in|Your session)/.test(outputText);
    if (!outputText || isError) return [] as { text: string; highlighted: boolean }[];
    const phrases: string[] = [];
    for (const t of glossary.terms) {
      const phrase = (sourceLanguage === 'zomi' ? t.term : t.meaning).trim();
      if (phrase.length >= 2) phrases.push(phrase);
    }
    if (!phrases.length) return [] as { text: string; highlighted: boolean }[];
    const unique = [...new Set(phrases)].sort((a, b) => b.length - a.length);
    const escaped = unique.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = outputText.split(regex).filter(Boolean);
    const lowerSet = new Set(unique.map((p) => p.toLowerCase()));
    return parts.map((p) => ({ text: p, highlighted: lowerSet.has(p.toLowerCase()) }));
  }, [outputText, glossary.terms, sourceLanguage]);

  const hasGlossaryHighlights = useMemo(
    () => glossarySegments.some((seg) => seg.highlighted),
    [glossarySegments]
  );

  const translate = useCallback(async (text: string, source: 'zomi' | 'english', target: string) => {
    if (!text || !text.trim()) {
      setOutputText('');
      setTranslationQuality(0);
      setIsTranslating(false);
      lastTranslatedText.current = '';
      return;
    }

    // Skip if same text and direction (prevents unnecessary re-translations)
    if (text.trim() === lastTranslatedText.current && `${source}→${target}` === lastDirection.current) {
      return;
    }

    // Increment request ID to track the latest request
    const currentRequestId = ++translationRequestId.current;
    
    // Update refs to track current translation
    lastTranslatedText.current = text.trim();
    lastDirection.current = `${source}→${target}`;
    setIsOfflineResult(false);
    setOfflineNote(null);
    setAlternatives([]);
    
    // Only show loading if we're not already translating (prevents flicker)
    if (!isTranslatingRef.current) {
      setIsTranslating(true);
      isTranslatingRef.current = true;
    }
    
    console.log(`[Request ${currentRequestId}] Starting translation...`);
    console.log('Input text:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    console.log('Direction:', `${source} → ${target}`);

    const targetLang: string = target;
    const sourceLang: 'zomi' | 'english' = source;

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
      // Signed-in members translate without limits; guests draw down their
      // 1,500-word free allowance tracked by a stable per-device anonymous ID.
      const authToken = (await getAccessToken()) ?? undefined;
      const anonymousId = await getAnonymousId();
      const streamResult = await stream.start(text.trim(), targetLang, {
        sourceLanguage: sourceLang,
        extraGlossary: glossary.asRecord(),
        authToken,
        anonymousId,
      });
      if (currentRequestId !== translationRequestId.current) return;
      if (streamResult.ok && streamResult.text) {
        setOutputText(streamResult.text);
        const conf = streamResult.confidence > 0 ? streamResult.confidence : 95;
        setTranslationQuality(conf);
        setAlternatives(streamResult.alternatives ?? []);
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
        // Quota and session problems must not fall through to the client-side fallback.
        if (/word.?limit/i.test(streamResult.error)) {
          setOutputText('You have used your 1,500 free words. Sign in from the Profile tab to keep translating.');
          setTranslationQuality(0);
          setIsTranslating(false);
          isTranslatingRef.current = false;
          return;
        }
        if (/401|unauthorized|sign.?in/i.test(streamResult.error)) {
          setOutputText(
            user
              ? 'Your session expired. Please sign in again from the Profile tab.'
              : 'You have used your 1,500 free words. Sign in from the Profile tab to keep translating.'
          );
          setTranslationQuality(0);
          setIsTranslating(false);
          isTranslatingRef.current = false;
          return;
        }
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
        anonymousId: await getAnonymousId(),
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
      setAlternatives(Array.isArray((result as any).alternatives) ? (result as any).alternatives : []);
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
      if (errMsg.toLowerCase().includes('word_limit_reached')) {
        setOutputText('You have used your 1,500 free words. Sign in from the Profile tab to keep translating.');
        setTranslationQuality(0);
        setIsTranslating(false);
        isTranslatingRef.current = false;
        return;
      }
      if (errMsg.toLowerCase().includes('sign in')) {
        setOutputText('Your session expired. Please sign in again from the Profile tab.');
        setTranslationQuality(0);
        setIsTranslating(false);
        isTranslatingRef.current = false;
        return;
      }
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
      const prompt = buildFallbackPrompt(text.trim(), sourceLang, targetLang);

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
        setIsOfflineResult(true);
        setOfflineNote('previously translated on this device');
        return;
      }

      // Offline dictionary: bundled common Zomi ⇄ English vocabulary plus the
      // user's personal glossary keeps working with no connection at all.
      const dictHit = offlineLookup(text.trim(), sourceLang, targetLang, glossary.asRecord());
      if (dictHit) {
        console.log('[offline] dictionary hit:', dictHit.fromUserGlossary ? 'personal glossary' : 'bundled');
        setOutputText(dictHit.translation);
        setTranslationQuality(88);
        setIsOfflineResult(true);
        const bits = [
          dictHit.entry.pos,
          dictHit.entry.note,
          dictHit.fromUserGlossary ? 'from your personal glossary' : null,
        ].filter(Boolean);
        setOfflineNote(bits.join(' · '));
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
  }, [translateMutation, stream, cache, glossary, user, getAccessToken]);

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
      translateRef.current(inputText, sourceLanguage, targetLanguage);
    }, 600); 
    
    return () => clearTimeout(timeoutId);
  }, [inputText, sourceLanguage, targetLanguage]);

  const handleSwapLanguages = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    const nextSource: 'zomi' | 'english' = targetLanguage as 'zomi' | 'english';
    const nextTarget = sourceLanguage;
    setSourceLanguage(nextSource);
    setTargetLanguage(nextTarget);
    
    if (outputText && !outputText.startsWith('Translation') && !outputText.startsWith('Service')) {
      const newInput = outputText;
      const newOutput = inputText;
      lastTranslatedText.current = newInput.trim();
      lastDirection.current = `${nextSource}→${nextTarget}`;
      setInputText(newInput);
      setOutputText(newOutput);
    } else {
      lastTranslatedText.current = '';
      setOutputText(''); 
    }
  }, [inputText, outputText, pulseAnim, sourceLanguage, targetLanguage]);

  const handleCopy = useCallback(async () => {
    if (outputText && !outputText.startsWith('Translation') && !outputText.startsWith('Service')) {
      await Clipboard.setStringAsync(outputText);
      setCopied(true);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showToast();
      setTimeout(() => setCopied(false), 2000);
    }
  }, [outputText, showToast]);

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

    // Generate a unique public link for this translation (zomi.me/t/<id>);
    // fall back to sharing plain text if the backend is unreachable.
    setIsCreatingShareLink(true);
    let shareUrl: string | null = null;
    try {
      shareUrl = await createShareLink({
        sourceText: inputText,
        translatedText: outputText,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        confidence: translationQuality,
        model: null,
      });
    } finally {
      setIsCreatingShareLink(false);
    }

    const message = [
      `${sourceLabel}: ${inputText}`,
      ``,
      `${targetLabel}: ${outputText}`,
      ``,
      shareUrl ? `View this translation: ${shareUrl}` : '',
      `Translated with Zomi Translator`,
    ]
      .filter(Boolean)
      .join('\n');
      
    if (Platform.OS === 'web') {
      // Try Web Share API first (works on mobile browsers and some desktop browsers)
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: 'Zomi Translation',
            text: message,
            url: shareUrl ?? undefined,
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
          ...(shareUrl ? { url: shareUrl } : {}),
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
  }, [inputText, outputText, sourceLanguage, targetLanguage, sourceLabel, targetLabel, translationQuality]);

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
        sourceLanguage: sourceLabel,
        targetLanguage: targetLabel,
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
  }, [inputText, outputText, sourceLabel, targetLabel]);

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

  const handleSpeak = useCallback((text: string, language: string) => {
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
                style={[styles.languageButton, styles.languageButtonActive]}
                onPress={() => {
                  const next: 'zomi' | 'english' = sourceLanguage === 'zomi' ? 'english' : 'zomi';
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  setSourceLanguage(next);
                  setTargetLanguage(next === 'zomi' ? 'english' : 'zomi');
                  lastTranslatedText.current = '';
                  setOutputText('');
                }}
              >
                <Text style={[styles.languageText, styles.languageTextActive]} numberOfLines={1}>
                  {sourceLabel}
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
              
              <View style={[styles.languageButton, styles.languageButtonActive]}>
                <Text style={[styles.languageText, styles.languageTextActive]} numberOfLines={1}>
                  {targetLabel}
                </Text>
              </View>
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
                {sourceLabel}
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
              placeholder={`Type ${sourceLabel} text...`}
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
              <View style={styles.outputLabelRow}>
                <Text style={styles.inputLabel}>
                  {targetLabel}
                </Text>
                {!!outputText && !isTranslating && !stream.isStreaming && !isOfflineResult && !outputText.startsWith('Translation') && !outputText.startsWith('Service') && !outputText.startsWith('Error:') && !outputText.startsWith('Invalid') && !outputText.startsWith('API') && !outputText.startsWith('Network') && !outputText.startsWith('Authentication') && !outputText.startsWith('Sign in') && !outputText.startsWith('Your session') && !outputText.startsWith('Request timed') && (
                  <View style={styles.officialBadge}>
                    <BadgeCheck size={12} color="#63C0FF" />
                    <Text style={styles.officialBadgeText}>Official</Text>
                  </View>
                )}
                {isOfflineResult && !!outputText && !isTranslating && !stream.isStreaming && (
                  <View style={styles.offlineBadge}>
                    <CloudOff size={12} color="#FFB84D" />
                    <Text style={styles.offlineBadgeText}>Offline dictionary</Text>
                  </View>
                )}
              </View>
              <View style={styles.outputActions}>
                <TouchableOpacity onPress={handleFavorite} style={styles.actionButton}>
                  <Star 
                    size={18} 
                    color={isFavorite ? Colors.accent : Colors.textSecondary}
                    fill={isFavorite ? Colors.accent : 'transparent'}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.actionButton} disabled={isCreatingShareLink}>
                  {isCreatingShareLink ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <ShareIcon size={18} color={Colors.textSecondary} />
                  )}
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
                  onPress={() => handleSpeak(outputText, languageTtsCode(targetLanguage))} 
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
            
            <Animated.View
              style={[
                styles.outputContent,
                { opacity: resultAnim, transform: [{ translateY: resultSlide }] },
              ]}
            >
              {isTranslating && !outputText ? (
                <View style={styles.loadingContainer}>
                  <TypingDots color={Colors.accent} dotSize={9} />
                  <Text style={styles.loadingText}>
                    {stream.isRetrying ? 'Connecting...' : 'Translating with Zomi AI...'}
                  </Text>
                </View>
              ) : outputText.startsWith('Translation') || outputText.startsWith('Service') || outputText.startsWith('Error:') || outputText.startsWith('Invalid') || outputText.startsWith('API') || outputText.startsWith('Network') || outputText.startsWith('Authentication') || outputText.startsWith('Sign in') || outputText.startsWith('Your session') || outputText.startsWith('Request timed') ? (
                <View style={styles.errorContainer}>
                  <AlertCircle size={20} color={Colors.error} />
                  <Text style={styles.errorText}>{outputText}</Text>
                  <TouchableOpacity onPress={() => translate(inputText, sourceLanguage, targetLanguage)} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : glossarySegments.length > 0 ? (
                <Text style={styles.outputText}>
                  {glossarySegments.map((seg, i) =>
                    seg.highlighted ? (
                      <Text key={i} style={styles.glossaryHighlight}>
                        {seg.text}
                      </Text>
                    ) : (
                      <Text key={i}>{seg.text}</Text>
                    )
                  )}
                </Text>
              ) : (
                <Text style={styles.outputText}>
                  {outputText || 'Translation will appear here...'}
                </Text>
              )}
            </Animated.View>

            {alternatives.length > 0 && !isTranslating && !stream.isStreaming && (
              <View style={styles.alternativesSection}>
                <Text style={styles.alternativesLabel}>Also common</Text>
                <View style={styles.alternativesRow}>
                  {alternatives.map((alt, i) => (
                    <TouchableOpacity
                      key={`${alt}-${i}`}
                      style={styles.alternativeChip}
                      activeOpacity={0.7}
                      onPress={() => {
                        // Promote the tapped alternative to the main translation.
                        const previous = outputText;
                        setOutputText(alt);
                        setAlternatives(alternatives.map((a, idx) => (idx === i ? previous : a)));
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={styles.alternativeChipText} numberOfLines={2}>
                        {alt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {isOfflineResult && !!outputText && !isTranslating && (
              <View style={styles.offlineNotice}>
                <CloudOff size={13} color="#FFB84D" />
                <Text style={styles.offlineNoticeText}>
                  {offlineNote ? `${offlineNote} — ` : ''}
                  served from offline vocabulary ({OFFLINE_ENTRY_COUNT}+ entries on this device). Full AI translation resumes when you are back online.
                </Text>
              </View>
            )}

            {hasGlossaryHighlights && !isTranslating && !stream.isStreaming && (
              <View style={styles.glossaryLegend}>
                <View style={styles.glossaryLegendDot} />
                <Text style={styles.glossaryLegendText}>
                  Highlighted words come from your personal glossary
                </Text>
              </View>
            )}

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

      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          { opacity: toastOpacity, transform: [{ translateY: toastTranslate }] },
        ]}
      >
        <View style={styles.toastPill}>
          <Check size={16} color={Colors.success} />
          <Text style={styles.toastText}>Copied!</Text>
        </View>
      </Animated.View>
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
  targetLanguageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 22, 0.65)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#323854',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderBottomWidth: 0,
    paddingBottom: 34,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  pickerHeaderTexts: {
    flex: 1,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  pickerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pickerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
  },
  pickerItemTexts: {
    flex: 1,
    marginRight: 12,
  },
  pickerItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  pickerItemLabelSelected: {
    color: Colors.primary,
  },
  pickerItemNative: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  toast: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: 'rgba(24, 28, 46, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
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
  outputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(29, 155, 240, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(29, 155, 240, 0.35)',
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#63C0FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 184, 77, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 77, 0.35)',
  },
  offlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFB84D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 184, 77, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 77, 0.2)',
  },
  offlineNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textSecondary,
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
  glossaryHighlight: {
    backgroundColor: 'rgba(255, 181, 71, 0.18)',
    color: '#FFB547',
    fontWeight: '700',
  },
  glossaryLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  glossaryLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 181, 71, 0.35)',
  },
  glossaryLegendText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
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
  alternativesSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surface,
  },
  alternativesLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  alternativesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alternativeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceMedium,
    maxWidth: '100%',
  },
  alternativeChipText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
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

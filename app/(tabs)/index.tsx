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
  BookOpen,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import * as ImagePicker from 'expo-image-picker';
import { generateText } from '@rork-ai/toolkit-sdk';
import { trpc } from '@/lib/trpc';


import GlassCard from '@/components/GlassCard';
import { useDictionary } from '@/contexts/DictionaryContext';

import Colors from '@/constants/colors';

import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { exportTranslation, ExportFormat, TranslationData } from '@/lib/exportUtils';

export default function TranslatorScreen() {
  const { triggerSearch } = useDictionary();
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
  const translationRequestId = useRef(0);
  const isTranslatingRef = useRef(false);
  const lastTranslatedText = useRef('');
  const lastDirection = useRef(true);

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
    
    // Try backend first
    try {
      const result = await translateMutation.mutateAsync({
        text: text.trim(),
        sourceLanguage: direction ? 'zomi' : 'english',
        targetLanguage: direction ? 'english' : 'zomi',
      });
      
      // Check if this is still the latest request
      if (currentRequestId !== translationRequestId.current) {
        console.log(`[Request ${currentRequestId}] Outdated, ignoring result`);
        return;
      }
      
      console.log('Backend translation successful:', result.model);
      setOutputText(result.translatedText);
      setTranslationQuality(100);
      setIsTranslating(false);
      isTranslatingRef.current = false;
      return;
    } catch (backendError: unknown) {
      // Check if this is still the latest request before proceeding
      if (currentRequestId !== translationRequestId.current) {
        console.log(`[Request ${currentRequestId}] Outdated after backend error, skipping fallback`);
        return;
      }
      console.log('Backend translation failed, trying fallback...', backendError);
    }
    
    // Fallback to client-side AI translation
    try {
      console.log('Using client-side AI fallback...');
      const sourceLanguage = direction ? 'zomi' : 'english';
      const targetLanguage = direction ? 'english' : 'zomi';
      
      let prompt = '';
      if (sourceLanguage === 'zomi' && targetLanguage === 'english') {
        prompt = `You are a Tedim Zomi (ISO 639-3: ctd) to English translator.
Use EXCLUSIVELY the Tedim (CTD) dialect. No other Zomi dialect.
Direct translation only.

TEDIM CTD VOCABULARY:
- "Lungdam" = Thank you (happy heart)
- "Pasian" = God
- "Innkuan" = Family
- "Nasep" = Work
- "Hoih" = Good/Beautiful
- "Hat" = Strong
- "Dam" = Well/Healthy
- "Pai" = Go
- "Hong" = Come
- "Ne" = Eat
- "Thei" = Know
- "Gen" = Say/Tell
- "Mu" = See
- "Za" = Hear
- "It" = Love
- "Om" = Exist/Stay
- "Nei" = Have/Possess
- "Pia" = Give
- "Sem/Sep" = Do/Work
- "Zil" = Learn
- "Hilh" = Teach
- "Mai kum" = Next year
- "Kum bangzah" = How old
- "ciang" = yet/still/afterward
- "bang" = what
- "na" = you, "ka" = I/my, "a" = he/she
- "hiam/maw" = question marker
- "ding" = will/future, "zo" = past, "lai" = progressive
- "kei/lo" = negation

EXAMPLES:
- "An kidah?" = "How are you?"
- "Ka dam e" = "I am fine"
- "Lungdam mahmah" = "Thank you very much"
- "Mai kum ciang bang sep sawm na?" = "What are you planning to do next year?"
- "Na kum bangzah hiam?" = "How old are you?"
- "Ka dam kei" = "I am not well"
- "Pasian in nang hong it hi" = "God loves you"
- "Ka innkuan dam uh" = "My family is well"

Translate: "${text.trim()}"

Output ONLY the English translation:`;
      } else {
        prompt = `You are an English to Tedim Zomi (ISO 639-3: ctd) translator.
Use EXCLUSIVELY the Tedim (CTD) dialect. NEVER use Paite, Mizo, Hakha Chin, Falam, or any other dialect.

TEDIM CTD VOCABULARY:
- Thank you = "Lungdam"
- God = "Pasian"
- Family = "Innkuan"
- Work = "Nasep"
- Good/Beautiful = "Hoih"
- Strong = "Hat"
- Well/Healthy = "Dam"
- Go = "Pai"
- Come = "Hong"
- Eat = "Ne"
- Know = "Thei"
- Say/Tell = "Gen"
- See = "Mu"
- Hear = "Za"
- Love = "It"
- Exist/Stay = "Om"
- Have/Possess = "Nei"
- Give = "Pia"
- Do/Work = "Sem/Sep"
- Learn = "Zil"
- Teach = "Hilh"
- Next year = "Mai kum"
- How old = "Kum bangzah"
- What = "bang"
- I/my = "ka", You/your = "na", He/she = "a"
- We/our = "kan", You all = "nan", They = "an"
- Question markers = "hiam", "maw", "ze", "ve"
- Will/future = "ding", Past = "zo", Progressive = "lai"
- Negation = verb + "kei" or "lo"
- Polite request = "ve aw"
- This = "hi", That = "tua"

GRAMMAR: SOV word order (Subject-Object-Verb)

EXAMPLES:
- "How are you?" = "An kidah?"
- "I am fine" = "Ka dam e"
- "Thank you very much" = "Lungdam mahmah"
- "What are you planning to do next year?" = "Mai kum ciang bang sep sawm na?"
- "How old are you?" = "Na kum bangzah hiam?"
- "I am not well" = "Ka dam kei"
- "God loves you" = "Pasian in nang hong it hi"
- "My family is well" = "Ka innkuan dam uh"

Translate: "${text.trim()}"

Output ONLY the Tedim Zomi (CTD) translation:`;
      }

      const fallbackResult = await generateText({ messages: [{ role: 'user', content: prompt }] });
      
      // Check if this is still the latest request
      if (currentRequestId !== translationRequestId.current) {
        console.log(`[Request ${currentRequestId}] Outdated after fallback, ignoring`);
        return;
      }
      
      setOutputText(fallbackResult.trim());
      setTranslationQuality(92);
    } catch (fallbackError: unknown) {
      // Check if this is still the latest request
      if (currentRequestId !== translationRequestId.current) {
        console.log(`[Request ${currentRequestId}] Outdated after fallback error, ignoring`);
        return;
      }
      
      console.error('Fallback translation also failed:', fallbackError);
      const errorMsg = fallbackError instanceof Error ? fallbackError.message.toLowerCase() : '';
      
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
  }, [translateMutation]);

  const translateRef = useRef(translate);
  translateRef.current = translate;

  useEffect(() => {
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
              {isTranslating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.accent} />
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

          {outputText && !isTranslating && !outputText.startsWith('Translation') && !outputText.startsWith('Service') && !outputText.startsWith('Error:') && !outputText.startsWith('Network') && !outputText.startsWith('API') && (
            <TouchableOpacity
              style={styles.lookupDictBtn}
              onPress={() => {
                const lookupText = isZomiToEnglish ? outputText.trim() : inputText.trim();
                if (lookupText) {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  triggerSearch(lookupText);
                  router.push('/(tabs)/dictionary' as any);
                }
              }}
              activeOpacity={0.7}
            >
              <BookOpen size={16} color="#00D9FF" />
              <Text style={styles.lookupDictText}>Look up in Dictionary</Text>
            </TouchableOpacity>
          )}

          
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
  lookupDictBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.25)',
    marginBottom: 16,
  },
  lookupDictText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#00D9FF',
  },
});

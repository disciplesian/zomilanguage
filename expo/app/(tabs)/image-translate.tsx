import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Camera, ImageIcon, Sparkles, Languages, Copy, RefreshCw } from 'lucide-react-native';

import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { generateText } from '@rork-ai/toolkit-sdk';

import Colors from '@/constants/colors';

interface ExtractedText {
  original: string;
  translation: string;
}

export default function ImageTranslation() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<ExtractedText | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const getImageBase64 = useCallback(async (uri: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
      
      if (uri.startsWith('file://') || uri.startsWith('content://')) {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
      
      return null;
    } catch (err) {
      console.error('Error getting image base64:', err);
      return null;
    }
  }, []);

  const processImage = useCallback(async (uri: string, base64Data?: string) => {
    setIsProcessing(true);
    setError(null);
    setProcessingStep('Preparing image...');
    
    try {
      let imageData = base64Data;
      
      if (!imageData) {
        setProcessingStep('Converting image...');
        const base64Result = await getImageBase64(uri);
        imageData = base64Result !== null ? base64Result : undefined;
      }

      if (!imageData) {
        throw new Error('Failed to process image data. Please try a different image.');
      }

      setProcessingStep('Extracting text from image...');
      console.log('Starting OCR extraction...');
      
      const extractedResult = await generateText({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an OCR expert. Extract ALL text visible in this image.

INSTRUCTIONS:
1. Look for ANY text in the image - handwritten, printed, typed, signs, labels, etc.
2. Preserve the original formatting and line breaks where possible
3. If text is in multiple languages, extract all of them
4. If text is unclear, make your best attempt to read it
5. Return ONLY the extracted text, nothing else
6. If absolutely no text is found, respond with exactly: NO_TEXT_FOUND`,
              },
              {
                type: 'image',
                image: 'data:image/jpeg;base64,' + imageData,
              },
            ],
          },
        ],
      });

      const originalText = extractedResult.trim();
      console.log('OCR result:', originalText.substring(0, 100) + '...');

      if (!originalText || originalText === 'NO_TEXT_FOUND') {
        setExtractedText({
          original: 'No text found in the image. Try uploading a clearer image with visible text.',
          translation: '',
        });
        setProcessingStep('');
        setIsProcessing(false);
        return;
      }

      setProcessingStep('Translating to Zomi...');
      console.log('Starting translation...');

      const translationResult = await generateText({
        messages: [
          {
            role: 'user',
            content: `You are an expert Tedim Zomi (ISO 639-3: ctd) linguist and translator.

TASK: Translate the following text using EXCLUSIVELY the Tedim (CTD) dialect.

CRITICAL DIALECT RULE:
- Use ONLY Tedim (CTD) vocabulary, grammar, and phonology.
- NEVER use words from Paite, Mizo (Lushai), Hakha Chin, Falam Chin, or any other Kuki-Chin language.

RULES:
1. If text is already in Tedim Zomi (CTD), translate it to English
2. If text is in English or another language, translate to Tedim Zomi (CTD)
3. Use ONLY authentic Tedim CTD vocabulary:
   - "Lungdam" = Thank you
   - "Pasian" = God
   - "Kham" = suffering
   - "Nung" = heart/mind
   - "Innkuan" = family
   - "Nasep" = work
   - "Hoih" = good/beautiful
   - "Hat" = strong
   - "Dam" = well/healthy
   - "Pai" = go, "Hong" = come
   - "Ne" = eat, "Thei" = know
   - "It" = love, "Lau" = fear
4. Follow Tedim grammar: SOV (Subject-Object-Verb) order
5. Use proper negation: verb + "kei" or "lo"
6. Pronouns: ka (I/my), na (you/your), a (he/she), kan (we), nan (you all), an (they)
7. Return ONLY the translation, no explanations

TEXT TO TRANSLATE:
${originalText}`,
          },
        ],
      });

      const translation = translationResult.trim();
      console.log('Translation result:', translation.substring(0, 100) + '...');

      setExtractedText({
        original: originalText,
        translation: translation,
      });
      
      setProcessingStep('');
    } catch (err) {
      console.error('Error processing image:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
      setError(errorMessage);
      Alert.alert('Processing Error', errorMessage + '\n\nPlease try again with a different image.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  }, [getImageBase64]);

  const pickImage = useCallback(async (useCamera: boolean) => {
    try {
      setError(null);
      let result: ImagePicker.ImagePickerResult;

      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Photo library permission is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        setExtractedText(null);
        setError(null);
        await processImage(asset.uri, asset.base64 || undefined);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError('Failed to pick image. Please try again.');
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, [processImage]);

  const retryProcessing = useCallback(async () => {
    if (selectedImage) {
      setError(null);
      await processImage(selectedImage);
    }
  }, [selectedImage, processImage]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      if (Platform.OS !== 'web') {
        Alert.alert('Copied!', 'Text copied to clipboard');
      }
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  }, []);

  const reset = useCallback(() => {
    setSelectedImage(null);
    setExtractedText(null);
    setError(null);
    setProcessingStep('');
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Image Translation',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!selectedImage ? (
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <ImageIcon size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Translate Text from Images</Text>
            <Text style={styles.emptyDescription}>
              Capture or upload an image with text to extract and translate it instantly. Works with handwritten text, printed documents, signs, and more.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => pickImage(true)}
                testID="camera-button"
              >
                <Camera size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => pickImage(false)}
                testID="gallery-button"
              >
                <ImageIcon size={24} color={Colors.primary} />
                <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                  Choose from Gallery
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Features:</Text>
              <View style={styles.featureItem}>
                <Sparkles size={16} color={Colors.primary} />
                <Text style={styles.featureText}>AI-powered text extraction (OCR)</Text>
              </View>
              <View style={styles.featureItem}>
                <Languages size={16} color={Colors.primary} />
                <Text style={styles.featureText}>Auto-detect and translate to Zomi</Text>
              </View>
              <View style={styles.featureItem}>
                <Copy size={16} color={Colors.primary} />
                <Text style={styles.featureText}>Easy copy to clipboard</Text>
              </View>
            </View>

            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Tips for best results:</Text>
              <Text style={styles.tipText}>• Use good lighting when taking photos</Text>
              <Text style={styles.tipText}>• Keep the camera steady and focused</Text>
              <Text style={styles.tipText}>• Ensure text is clearly visible</Text>
              <Text style={styles.tipText}>• Works with handwritten and printed text</Text>
            </View>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              {isProcessing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.processingText}>
                    {processingStep || 'Processing...'}
                  </Text>
                </View>
              )}
            </View>

            {error && !isProcessing && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={retryProcessing}>
                  <RefreshCw size={18} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {extractedText && !isProcessing && (
              <View style={styles.textResultsContainer}>
                <View style={styles.textCard}>
                  <View style={styles.textCardHeader}>
                    <Text style={styles.textCardTitle}>Extracted Text</Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(extractedText.original)}
                      style={styles.copyButton}
                      testID="copy-original-button"
                    >
                      <Copy size={18} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.textContent} selectable>{extractedText.original}</Text>
                </View>

                {extractedText.translation && extractedText.translation.length > 0 && (
                  <View style={styles.textCard}>
                    <View style={styles.textCardHeader}>
                      <Text style={styles.textCardTitle}>Zomi Translation</Text>
                      <TouchableOpacity
                        onPress={() => copyToClipboard(extractedText.translation)}
                        style={styles.copyButton}
                        testID="copy-translation-button"
                      >
                        <Copy size={18} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.textContent} selectable>{extractedText.translation}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={styles.newImageButton} 
                onPress={reset}
                testID="new-image-button"
              >
                <ImageIcon size={20} color="#FFFFFF" />
                <Text style={styles.newImageButtonText}>New Image</Text>
              </TouchableOpacity>

              {extractedText && !isProcessing && (
                <TouchableOpacity 
                  style={styles.retranslateButton} 
                  onPress={retryProcessing}
                  testID="retranslate-button"
                >
                  <RefreshCw size={20} color={Colors.primary} />
                  <Text style={styles.retranslateButtonText}>Re-process</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.primary + '20',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: Colors.primary,
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 12,
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  resultContainer: {
    gap: 20,
  },
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: Colors.error + '20',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error + '40',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  textResultsContainer: {
    gap: 16,
  },
  textCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  textCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  textCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  textContent: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.text,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  newImageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  newImageButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  retranslateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  retranslateButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});

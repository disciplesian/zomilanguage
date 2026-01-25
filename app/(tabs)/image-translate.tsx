import React, { useState } from 'react';
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
import { Camera, ImageIcon, Sparkles, Languages, Copy } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const pickImage = async (useCamera: boolean) => {
    try {
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

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        setExtractedText(null);
        await processImage(asset.uri, asset.base64 ?? undefined);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const processImage = async (uri: string, base64?: string) => {
    setIsProcessing(true);
    try {
      let imageData = base64;
      
      if (!imageData && uri.startsWith('file://')) {
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Result = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(blob);
        });
        imageData = base64Result;
      }

      if (!imageData) {
        throw new Error('Failed to get image data');
      }

      const extractPrompt = await generateText({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. Return ONLY the extracted text, nothing else. If there is no text, respond with "No text found".',
              },
              {
                type: 'image',
                image: `data:image/jpeg;base64,${imageData}`,
              },
            ],
          },
        ],
      });

      const originalText = extractPrompt.trim();

      if (!originalText || originalText === 'No text found') {
        setExtractedText({
          original: 'No text found in the image.',
          translation: '',
        });
        return;
      }

      const translationPrompt = await generateText({
        messages: [
          {
            role: 'user',
            content: `You are an expert Tedim Zomi linguist.
            
Task: Translate the following text to Zomi (Tedim dialect).
- If the text is already in Zomi, translate it to English.
- If the text is in another language, translate it to Zomi (Tedim).

**CRITICAL TEDIM DIALECT RULES:**
- Use ONLY Tedim dialect vocabulary (e.g., "Lungdam" for Thank you, "Pasian" for God).
- DO NOT use vocabulary from Paite, Mizo, Hakha, or Falam.
- Use proper Tedim orthography and grammar (SOV order, "kei/lo" for negation after verb).

Return ONLY the translation, nothing else.

Text to translate:
${originalText}`,
          },
        ],
      });

      setExtractedText({
        original: originalText,
        translation: translationPrompt.trim(),
      });
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== 'web') {
      Alert.alert('Copied!', 'Text copied to clipboard');
    }
  };

  const reset = () => {
    setSelectedImage(null);
    setExtractedText(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Image Translation',
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {!selectedImage ? (
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <ImageIcon size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Translate Text from Images</Text>
            <Text style={styles.emptyDescription}>
              Capture or upload an image with text to extract and translate it instantly.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => pickImage(true)}
              >
                <Camera size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => pickImage(false)}
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
                <Text style={styles.featureText}>Auto-detect and translate</Text>
              </View>
              <View style={styles.featureItem}>
                <Copy size={16} color={Colors.primary} />
                <Text style={styles.featureText}>Easy copy to clipboard</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              {isProcessing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.processingText}>Processing...</Text>
                </View>
              )}
            </View>

            {extractedText && !isProcessing && (
              <View style={styles.textResultsContainer}>
                <View style={styles.textCard}>
                  <View style={styles.textCardHeader}>
                    <Text style={styles.textCardTitle}>Extracted Text</Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(extractedText.original)}
                      style={styles.copyButton}
                    >
                      <Copy size={18} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.textContent}>{extractedText.original}</Text>
                </View>

                {extractedText.translation && (
                  <View style={styles.textCard}>
                    <View style={styles.textCardHeader}>
                      <Text style={styles.textCardTitle}>Translation</Text>
                      <TouchableOpacity
                        onPress={() => copyToClipboard(extractedText.translation)}
                        style={styles.copyButton}
                      >
                        <Copy size={18} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.textContent}>{extractedText.translation}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.newImageButton} onPress={reset}>
                <ImageIcon size={20} color="#FFFFFF" />
                <Text style={styles.newImageButtonText}>New Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingVertical: 40,
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
    fontWeight: '700',
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
    marginBottom: 32,
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
    fontWeight: '700',
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
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
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
    fontWeight: '700',
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
    gap: 12,
  },
  newImageButton: {
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
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

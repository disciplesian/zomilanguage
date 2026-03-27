import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

export type ExportFormat = 'text' | 'json' | 'clipboard' | 'txt' | 'pdf' | 'png' | 'word';

export interface TranslationData {
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp?: Date;
}

export async function exportTranslation(
  data: TranslationData,
  format: ExportFormat
): Promise<boolean> {
  try {
    const formattedText = formatTranslation(data, format);

    if (format === 'clipboard') {
      try {
        await Clipboard.setStringAsync(formattedText);
        return true;
      } catch (clipboardError) {
        console.warn('Clipboard error, trying fallback:', clipboardError);
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(formattedText);
            return true;
          } catch {
            // Final fallback
          }
        }
        Alert.alert('Export', 'Could not copy to clipboard. Please try again.');
        return false;
      }
    }

    if (Platform.OS === 'web') {
      return downloadOnWeb(formattedText, format);
    }

    // Native: try file sharing, with safe fallback
    try {
      let fileUri: string | null = null;
      const extension = format === 'json' ? 'json' : 'txt';
      const fileName = `translation_${Date.now()}.${extension}`;

      try {
        const fsModule = await import('expo-file-system');
        if (fsModule?.File && fsModule?.Paths?.cache) {
          const file = new fsModule.File(fsModule.Paths.cache, fileName);
          file.create({ overwrite: true });
          file.write(formattedText);
          fileUri = file.uri;
        }
      } catch (fsError) {
        console.warn('expo-file-system not available, falling back:', fsError);
      }

      if (fileUri) {
        let canShare = false;
        try {
          canShare = await Sharing.isAvailableAsync();
        } catch {
          canShare = false;
        }

        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: format === 'json' ? 'application/json' : 'text/plain',
            dialogTitle: 'Export Translation',
          });
          return true;
        }
      }

      await Clipboard.setStringAsync(formattedText);
      Alert.alert('Copied!', 'Translation copied to clipboard.');
      return true;
    } catch (fileError) {
      console.warn('File export error, falling back to clipboard:', fileError);
      try {
        await Clipboard.setStringAsync(formattedText);
        Alert.alert('Copied!', 'Translation copied to clipboard.');
        return true;
      } catch {
        Alert.alert('Export Error', 'Could not export translation. Please try again.');
        return false;
      }
    }
  } catch (error) {
    console.error('Export error:', error);
    Alert.alert('Export Error', 'An unexpected error occurred. Please try again.');
    return false;
  }
}

function formatTranslation(data: TranslationData, format: ExportFormat): string {
  if (format === 'json') {
    return JSON.stringify({
      source: {
        language: data.sourceLanguage,
        text: data.sourceText,
      },
      translation: {
        language: data.targetLanguage,
        text: data.translatedText,
      },
      timestamp: data.timestamp?.toISOString() || new Date().toISOString(),
    }, null, 2);
  }

  return `${data.sourceLanguage.toUpperCase()}:\n${data.sourceText}\n\n${data.targetLanguage.toUpperCase()}:\n${data.translatedText}`;
}

function downloadOnWeb(content: string, format: ExportFormat): boolean {
  try {
    if (typeof document === 'undefined' || typeof Blob === 'undefined') {
      console.warn('Web download not available in this environment');
      return false;
    }

    const mimeType = format === 'json' ? 'application/json' : 'text/plain';
    const extension = format === 'json' ? 'json' : 'txt';
    
    const blob = new Blob([content], { type: mimeType });
    
    // Try using the modern download API first
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translation_${Date.now()}.${extension}`;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch {
          // Ignore cleanup errors
        }
      }, 100);
      
      return true;
    }
    
    // Fallback for older browsers
    if (typeof window !== 'undefined' && (window as any).navigator?.msSaveOrOpenBlob) {
      (window as any).navigator.msSaveOrOpenBlob(blob, `translation_${Date.now()}.${extension}`);
      return true;
    }
    
    console.warn('No download method available');
    return false;
  } catch (error) {
    console.error('Web download error:', error);
    return false;
  }
}

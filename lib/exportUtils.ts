import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

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
      await Clipboard.setStringAsync(formattedText);
      return true;
    }

    if (Platform.OS === 'web') {
      downloadOnWeb(formattedText, format);
      return true;
    }

    const extension = format === 'json' ? 'json' : 'txt';
    const fileName = `translation_${Date.now()}.${extension}`;
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(formattedText);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: format === 'json' ? 'application/json' : 'text/plain',
        dialogTitle: 'Export Translation',
      });
    }

    return true;
  } catch (error) {
    console.error('Export error:', error);
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

function downloadOnWeb(content: string, format: ExportFormat): void {
  const blob = new Blob([content], { 
    type: format === 'json' ? 'application/json' : 'text/plain' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `translation_${Date.now()}.${format === 'json' ? 'json' : 'txt'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

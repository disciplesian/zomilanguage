import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { generateText } from '@rork-ai/toolkit-sdk';

export type DocumentType = 'image' | 'pdf' | 'text' | 'csv' | 'word' | 'excel' | 'unknown';

export interface ProcessedDocument {
  id: string;
  name: string;
  type: DocumentType;
  extractedText: string;
  uri: string;
  size: number;
  timestamp: Date;
}

export interface BatchItem {
  id: string;
  sourceText: string;
  translatedText: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/*',
];

function getDocumentType(mimeType: string, fileName: string): DocumentType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
    return 'image';
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (mimeType === 'text/plain' || ext === 'txt') {
    return 'text';
  }
  if (mimeType === 'text/csv' || ext === 'csv') {
    return 'csv';
  }
  if (mimeType.includes('word') || ['doc', 'docx'].includes(ext)) {
    return 'word';
  }
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || ['xls', 'xlsx'].includes(ext)) {
    return 'excel';
  }
  return 'unknown';
}

function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useDocumentProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const extractTextFromImage = useCallback(async (base64Image: string, docType: string = 'image'): Promise<string> => {
    console.log(`DocProcessor: Extracting text from ${docType} via AI OCR...`);
    
    try {
      const promptText = docType === 'image' 
        ? `Extract ALL visible text from this image.`
        : `Extract ALL text content from this ${docType.toUpperCase()} document image.`;

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
                text: `${promptText}
                
Rules:
- Return ONLY the extracted text, nothing else
- Preserve the original formatting, paragraphs, and line breaks as much as possible
- If there are multiple columns or pages, read left to right, top to bottom
- If the text is in a language other than English, still extract it as-is
- Include all headers, footers, and any visible text
- If there is no text visible, return "NO_TEXT_FOUND"

Extracted text:`,
              },
            ],
          },
        ],
      });

      console.log(`DocProcessor: ${docType} OCR extraction completed`);

      if (!extractedText || extractedText === 'NO_TEXT_FOUND' || extractedText.trim().length === 0) {
        console.log(`DocProcessor: No text found in ${docType}`);
        return '';
      }

      return extractedText.trim();
    } catch (err) {
      console.error(`DocProcessor: ${docType} OCR error`, err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('DocProcessor: Error details:', errorMessage);
      throw new Error(`Failed to extract text from ${docType}. Please try again.`);
    }
  }, []);

  const extractTextFromDocument = useCallback(async (uri: string, mimeType: string, docType: DocumentType): Promise<string> => {
    console.log(`DocProcessor: Extracting text from ${docType} document...`);
    
    try {
      if (docType === 'text' || docType === 'csv') {
        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const text = await response.text();
          return text;
        } else {
          const content = await FileSystem.readAsStringAsync(uri);
          return content;
        }
      }

      if (docType === 'image') {
        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              try {
                const text = await extractTextFromImage(base64);
                resolve(text);
              } catch (err) {
                reject(err);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
          });
          return await extractTextFromImage(base64);
        }
      }

      if (docType === 'pdf' || docType === 'word') {
        throw new Error(`${docType.toUpperCase()} files are not supported. Please use images, text files, or CSV files instead.`);
      }

      if (docType === 'excel') {
        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const text = await response.text();
          return text;
        } else {
          const content = await FileSystem.readAsStringAsync(uri);
          return content;
        }
      }

      return '[Unable to process this document type]';
    } catch (err) {
      console.error('DocProcessor: Extraction error', err);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(`Failed to extract text from ${docType} document`);
    }
  }, [extractTextFromImage]);

  const pickDocument = useCallback(async (): Promise<ProcessedDocument | null> => {
    setError(null);
    setIsProcessing(true);
    setProgress(10);

    try {
      console.log('DocProcessor: Opening document picker...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_MIME_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('DocProcessor: Document picker cancelled');
        setIsProcessing(false);
        setProgress(0);
        return null;
      }

      const asset = result.assets[0];
      console.log('DocProcessor: Document selected:', asset.name, asset.mimeType);
      
      setProgress(30);

      const docType = getDocumentType(asset.mimeType || '', asset.name);
      
      if (docType === 'pdf' || docType === 'word') {
        Alert.alert(
          'Unsupported Format',
          `${docType.toUpperCase()} files are not supported. Please use images, text files, or CSV files instead.`
        );
        setIsProcessing(false);
        setProgress(0);
        return null;
      }
      
      setProgress(50);
      
      const extractedText = await extractTextFromDocument(asset.uri, asset.mimeType || '', docType);
      
      setProgress(90);

      const processedDoc: ProcessedDocument = {
        id: generateId(),
        name: asset.name,
        type: docType,
        extractedText,
        uri: asset.uri,
        size: asset.size || 0,
        timestamp: new Date(),
      };

      setProgress(100);
      setIsProcessing(false);
      
      console.log('DocProcessor: Document processed successfully');
      return processedDoc;
    } catch (err) {
      console.error('DocProcessor: Error processing document', err);
      setError(err instanceof Error ? err.message : 'Failed to process document');
      setIsProcessing(false);
      setProgress(0);
      return null;
    }
  }, [extractTextFromDocument]);

  const pickImage = useCallback(async (useCamera: boolean = false): Promise<ProcessedDocument | null> => {
    setError(null);
    setIsProcessing(true);
    setProgress(10);

    try {
      let result;
      
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow camera access to take photos.');
          setIsProcessing(false);
          setProgress(0);
          return null;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library.');
          setIsProcessing(false);
          setProgress(0);
          return null;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('DocProcessor: Image picker cancelled');
        setIsProcessing(false);
        setProgress(0);
        return null;
      }

      const asset = result.assets[0];
      console.log('DocProcessor: Image selected');
      
      setProgress(40);

      if (!asset.base64) {
        throw new Error('Failed to get image data');
      }

      const extractedText = await extractTextFromImage(asset.base64);
      
      setProgress(90);

      const processedDoc: ProcessedDocument = {
        id: generateId(),
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: 'image',
        extractedText,
        uri: asset.uri,
        size: asset.fileSize || 0,
        timestamp: new Date(),
      };

      setProgress(100);
      setIsProcessing(false);
      
      return processedDoc;
    } catch (err) {
      console.error('DocProcessor: Error processing image', err);
      setError(err instanceof Error ? err.message : 'Failed to process image');
      setIsProcessing(false);
      setProgress(0);
      return null;
    }
  }, [extractTextFromImage]);

  const parseCSV = useCallback((csvContent: string): string[][] => {
    const lines = csvContent.split(/\r?\n/);
    const result: string[][] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        cells.push(current.trim());
        result.push(cells);
      }
    }
    
    return result;
  }, []);

  const generateCSV = useCallback((data: string[][]): string => {
    return data.map(row => 
      row.map(cell => {
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isProcessing,
    error,
    progress,
    pickDocument,
    pickImage,
    extractTextFromImage,
    parseCSV,
    generateCSV,
    clearError,
  };
}

/**
 * Exports the TranslationShareCard SVG view to a PNG and opens the native
 * share sheet. Uses react-native-svg's toDataURL (Expo Go compatible);
 * on web it falls back to a browser download.
 */
import { Platform } from 'react-native';
import type { RefObject } from 'react';
// SDK 54: the classic cacheDirectory/writeAsStringAsync API lives in /legacy.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Svg } from 'react-native-svg';

export interface ShareCardResult {
  ok: boolean;
  reason?: string;
}

/** Renders the referenced SVG card to a base64 data URL. Never rejects. */
async function cardDataUrl(svgRef: RefObject<Svg | null>): Promise<string | null> {
  try {
    const svg = svgRef.current;
    if (!svg || typeof svg.toDataURL !== 'function') return null;
    return await new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 10_000);
      svg.toDataURL((data: string) => {
        clearTimeout(timer);
        resolve(typeof data === 'string' && data.length > 0 ? data : null);
      });
    });
  } catch (error) {
    console.log('[shareImage] capture failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function shareTranslationCard(
  svgRef: RefObject<Svg | null>,
  fileName = `zomi-translation-${Date.now()}.png`
): Promise<ShareCardResult> {
  const dataUrl = await cardDataUrl(svgRef);
  if (!dataUrl) {
    return { ok: false, reason: 'Could not render the share card. Please try again.' };
  }
  const base64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;

  if (Platform.OS === 'web') {
    try {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return { ok: true };
    } catch {
      return { ok: false, reason: 'Image download is not supported in this browser.' };
    }
  }

  try {
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, reason: 'Sharing is not available on this device.' };
    }
    await Sharing.shareAsync(fileUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share translation card',
      UTI: 'public.png',
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    if (/cancel/i.test(message)) return { ok: true };
    console.log('[shareImage] share failed:', message);
    return { ok: false, reason: 'Could not open the share sheet. Please try again.' };
  }
}

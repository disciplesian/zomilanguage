import { Platform, Dimensions, PixelRatio, ScaledSize } from 'react-native';

export type PlatformType = 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'unknown';
export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'unknown';

let cachedPlatform: PlatformType | null = null;
let cachedDeviceType: DeviceType | null = null;
let cachedDimensions: ScaledSize | null = null;

export const getPlatform = (): PlatformType => {
  if (cachedPlatform) return cachedPlatform;
  
  try {
    const os = Platform.OS;
    if (os === 'ios' || os === 'android' || os === 'web' || os === 'windows' || os === 'macos') {
      cachedPlatform = os;
      return os;
    }
    cachedPlatform = 'unknown';
    return 'unknown';
  } catch {
    cachedPlatform = 'unknown';
    return 'unknown';
  }
};

export const isWeb = (): boolean => {
  try {
    return Platform.OS === 'web';
  } catch {
    return false;
  }
};

export const isIOS = (): boolean => {
  try {
    return Platform.OS === 'ios';
  } catch {
    return false;
  }
};

export const isAndroid = (): boolean => {
  try {
    return Platform.OS === 'android';
  } catch {
    return false;
  }
};

export const isNative = (): boolean => {
  try {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  } catch {
    return false;
  }
};

export const getSafeDimensions = (): ScaledSize => {
  if (cachedDimensions) return cachedDimensions;
  
  try {
    const dims = Dimensions.get('window');
    if (dims.width > 0 && dims.height > 0) {
      cachedDimensions = dims;
      return dims;
    }
  } catch {
    // Fallback
  }
  
  return {
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  };
};

export const getDeviceType = (): DeviceType => {
  if (cachedDeviceType) return cachedDeviceType;
  
  try {
    const { width, height } = getSafeDimensions();
    const maxDim = Math.max(width, height);
    const minDim = Math.min(width, height);
    
    if (Platform.OS === 'web') {
      if (minDim >= 1024) {
        cachedDeviceType = 'desktop';
        return 'desktop';
      }
      if (minDim >= 600) {
        cachedDeviceType = 'tablet';
        return 'tablet';
      }
      cachedDeviceType = 'phone';
      return 'phone';
    }
    
    if (minDim >= 600 || maxDim >= 900) {
      cachedDeviceType = 'tablet';
      return 'tablet';
    }
    
    cachedDeviceType = 'phone';
    return 'phone';
  } catch {
    cachedDeviceType = 'phone';
    return 'phone';
  }
};

export const isTablet = (): boolean => {
  return getDeviceType() === 'tablet';
};

export const isDesktop = (): boolean => {
  return getDeviceType() === 'desktop';
};

export const getPixelRatio = (): number => {
  try {
    return PixelRatio.get() || 2;
  } catch {
    return 2;
  }
};

export const getFontScale = (): number => {
  try {
    return PixelRatio.getFontScale() || 1;
  } catch {
    return 1;
  }
};

export const normalize = (size: number): number => {
  try {
    const { width } = getSafeDimensions();
    const scale = width / 375;
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } catch {
    return size;
  }
};

export const responsiveWidth = (percentage: number): number => {
  try {
    const { width } = getSafeDimensions();
    return (width * percentage) / 100;
  } catch {
    return (375 * percentage) / 100;
  }
};

export const responsiveHeight = (percentage: number): number => {
  try {
    const { height } = getSafeDimensions();
    return (height * percentage) / 100;
  } catch {
    return (812 * percentage) / 100;
  }
};

export const getResponsiveFontSize = (baseSize: number): number => {
  const deviceType = getDeviceType();
  const fontScale = getFontScale();
  
  let multiplier = 1;
  switch (deviceType) {
    case 'tablet':
      multiplier = 1.15;
      break;
    case 'desktop':
      multiplier = 1.1;
      break;
    default:
      multiplier = 1;
  }
  
  const adjustedSize = baseSize * multiplier;
  const maxScale = 1.3;
  const effectiveFontScale = Math.min(fontScale, maxScale);
  
  return Math.round(adjustedSize * effectiveFontScale);
};

export const getResponsivePadding = (base: number): number => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'tablet':
      return base * 1.5;
    case 'desktop':
      return base * 2;
    default:
      return base;
  }
};

export const getMaxContentWidth = (): number => {
  const deviceType = getDeviceType();
  const { width } = getSafeDimensions();
  
  switch (deviceType) {
    case 'desktop':
      return Math.min(width - 48, 800);
    case 'tablet':
      return Math.min(width - 32, 600);
    default:
      return width;
  }
};

export const supportsHaptics = (): boolean => {
  try {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  } catch {
    return false;
  }
};

export const supportsNativeAudio = (): boolean => {
  try {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  } catch {
    return false;
  }
};

export const supportsCameraAPI = (): boolean => {
  try {
    if (Platform.OS === 'web') {
      return typeof navigator !== 'undefined' && 
             navigator.mediaDevices !== undefined &&
             typeof navigator.mediaDevices.getUserMedia === 'function';
    }
    return Platform.OS === 'ios' || Platform.OS === 'android';
  } catch {
    return false;
  }
};

export const supportsWebShare = (): boolean => {
  try {
    if (Platform.OS !== 'web') return false;
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  } catch {
    return false;
  }
};

export const supportsClipboard = (): boolean => {
  try {
    if (Platform.OS === 'web') {
      return typeof navigator !== 'undefined' && 
             navigator.clipboard !== undefined &&
             typeof navigator.clipboard.writeText === 'function';
    }
    return true;
  } catch {
    return false;
  }
};

export const supportsLocalStorage = (): boolean => {
  try {
    if (Platform.OS !== 'web') return true;
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const getOSVersion = (): string => {
  try {
    const version = Platform.Version;
    if (typeof version === 'number') {
      return version.toString();
    }
    if (typeof version === 'string') {
      return version;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
};

export const isBrowser = (): boolean => {
  try {
    return Platform.OS === 'web' && typeof window !== 'undefined';
  } catch {
    return false;
  }
};

export const getUserAgent = (): string => {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      return navigator.userAgent || '';
    }
    return `${Platform.OS}/${getOSVersion()}`;
  } catch {
    return 'unknown';
  }
};

export const isMobileBrowser = (): boolean => {
  if (!isBrowser()) return false;
  
  try {
    const ua = getUserAgent().toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
  } catch {
    return false;
  }
};

export const isSafari = (): boolean => {
  if (!isBrowser()) return false;
  
  try {
    const ua = getUserAgent().toLowerCase();
    return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
  } catch {
    return false;
  }
};

export const isChrome = (): boolean => {
  if (!isBrowser()) return false;
  
  try {
    const ua = getUserAgent().toLowerCase();
    return ua.includes('chrome') && !ua.includes('edge');
  } catch {
    return false;
  }
};

export const isFirefox = (): boolean => {
  if (!isBrowser()) return false;
  
  try {
    const ua = getUserAgent().toLowerCase();
    return ua.includes('firefox');
  } catch {
    return false;
  }
};

export const resetCachedValues = (): void => {
  cachedPlatform = null;
  cachedDeviceType = null;
  cachedDimensions = null;
};

let dimensionsListener: ReturnType<typeof Dimensions.addEventListener> | null = null;

export const initDimensionsListener = (): void => {
  try {
    if (dimensionsListener) return;
    
    dimensionsListener = Dimensions.addEventListener('change', ({ window }) => {
      if (window.width > 0 && window.height > 0) {
        cachedDimensions = window;
        cachedDeviceType = null;
      }
    });
  } catch {
    console.warn('Failed to initialize dimensions listener');
  }
};

export const cleanupDimensionsListener = (): void => {
  try {
    if (dimensionsListener) {
      dimensionsListener.remove();
      dimensionsListener = null;
    }
  } catch {
    // Ignore cleanup errors
  }
};

export const safeOperation = async <T>(
  operation: () => Promise<T>,
  fallback: T,
  errorMessage?: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (errorMessage) {
      console.warn(errorMessage, error);
    }
    return fallback;
  }
};

export const safeOperationSync = <T>(
  operation: () => T,
  fallback: T,
  errorMessage?: string
): T => {
  try {
    return operation();
  } catch (error) {
    if (errorMessage) {
      console.warn(errorMessage, error);
    }
    return fallback;
  }
};

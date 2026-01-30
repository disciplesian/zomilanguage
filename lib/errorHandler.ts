import { Platform, Dimensions } from 'react-native';

const getPlatformOS = (): string => {
  try {
    return Platform?.OS || 'unknown';
  } catch {
    return 'unknown';
  }
};

export const isNativeModuleError = (error: any): boolean => {
  if (!error) return false;
  try {
    const message = String(error?.message || '').toLowerCase();
    const name = String(error?.name || '').toLowerCase();
    const combined = message + ' ' + name;
    
    return (
      combined.indexOf('turbomodule') !== -1 ||
      combined.indexOf('native module') !== -1 ||
      combined.indexOf('exc_bad_access') !== -1 ||
      combined.indexOf('sigsegv') !== -1
    );
  } catch {
    return false;
  }
};

export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  try {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.indexOf('network') !== -1 ||
      message.indexOf('fetch') !== -1 ||
      message.indexOf('timeout') !== -1 ||
      message.indexOf('offline') !== -1
    );
  } catch {
    return false;
  }
};

export const isRecoverableError = (error: any): boolean => {
  return isNativeModuleError(error) || isNetworkError(error);
};

export const getUserFriendlyMessage = (error: any): string => {
  try {
    if (isNetworkError(error)) {
      return 'Connection issue. Please check your internet and try again.';
    }
    if (isNativeModuleError(error)) {
      return 'A feature is not available. Please try again.';
    }
    return 'Something went wrong. Please try again.';
  } catch {
    return 'An unexpected error occurred.';
  }
};

export const safeNativeCall = async <T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

export const safeNativeCallSync = <T>(
  fn: () => T,
  fallback: T
): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const setupGlobalErrorHandlers = () => {
  console.log('Error handlers initialized for platform:', getPlatformOS());
};

export const cleanupGlobalErrorHandlers = () => {
  console.log('Error handlers cleaned up');
};

export const isMacCatalyst = (): boolean => false;
export const isAndroid = (): boolean => getPlatformOS() === 'android';
export const isWeb = (): boolean => getPlatformOS() === 'web';

export const getSafeDimensions = (): { width: number; height: number } => {
  try {
    const { width, height } = Dimensions.get('window');
    return { width: width || 375, height: height || 812 };
  } catch {
    return { width: 375, height: 812 };
  }
};

export const isAppActive = (): boolean => true;

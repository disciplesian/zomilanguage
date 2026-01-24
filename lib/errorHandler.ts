import { Platform, Dimensions } from 'react-native';

/**
 * Detects if the app is running on Mac Catalyst
 */
export const isMacCatalyst = (): boolean => {
  try {
    if (Platform.OS === 'macos') return true;
    if (Platform.OS === 'web') return false;
    if (Platform.OS !== 'ios') return false;
    
    const { width, height } = Dimensions.get('window');
    const isLargeScreen = Math.max(width, height) > 1200;
    
    try {
      const platformConstants = (Platform as any).constants;
      if (platformConstants?.interfaceIdiom === 'mac') return true;
    } catch {
      // Ignore platform constants access error
    }
    
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('macintosh') || ua.includes('mac os')) {
        return true;
      }
    }
    
    if (isLargeScreen && Platform.OS === 'ios') {
      try {
        const isPad = (Platform as any).isPad;
        if (!isPad) return true;
      } catch {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
};

/**
 * Checks if an error is related to native modules
 */
export const isNativeModuleError = (error: any): boolean => {
  try {
    const message = error?.message || '';
    const name = error?.name || '';
    const stack = error?.stack || '';
    const toString = error?.toString() || '';
    
    const errorString = `${message} ${name} ${stack} ${toString}`.toLowerCase();
    
    return (
      errorString.includes('turbomodule') ||
      errorString.includes('nsexception') ||
      errorString.includes('native module') ||
      errorString.includes('nativemodules') ||
      errorString.includes('turbomodulemanager') ||
      errorString.includes('rctbridge') ||
      errorString.includes('rctmodule') ||
      errorString.includes('hermes') ||
      errorString.includes('dictpropertymap') ||
      errorString.includes('hiddenclass') ||
      errorString.includes('exc_bad_access') ||
      errorString.includes('sigsegv') ||
      errorString.includes('kern_invalid_address') ||
      errorString.includes('convertnsexceptiontojserror') ||
      errorString.includes('objcturbomodule') ||
      errorString.includes('performvoidmethodinvocation')
    );
  } catch {
    return false;
  }
};

/**
 * Safely wraps a native module call to prevent crashes
 */
export const safeNativeCall = async <T>(
  fn: () => Promise<T>,
  fallback: T,
  errorMessage?: string
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message || '';
    const errorName = error?.name || '';
    
    if (isNativeModuleError(error)) {
      console.warn(
        errorMessage || 'Native module call failed (suppressed):',
        errorMsg || errorName
      );
      return fallback;
    }
    
    // For non-native errors, still log but return fallback
    console.warn(
      errorMessage || 'Function call failed:',
      errorMsg || errorName
    );
    return fallback;
  }
};

/**
 * Safely wraps a synchronous native module call
 */
export const safeNativeCallSync = <T>(
  fn: () => T,
  fallback: T,
  errorMessage?: string
): T => {
  try {
    return fn();
  } catch (error: any) {
    const errorMsg = error?.message || '';
    const errorName = error?.name || '';
    
    if (isNativeModuleError(error)) {
      console.warn(
        errorMessage || 'Native module call failed (suppressed):',
        errorMsg || errorName
      );
      return fallback;
    }
    
    console.warn(
      errorMessage || 'Function call failed:',
      errorMsg || errorName
    );
    return fallback;
  }
};

/**
 * Global error handler for unhandled errors
 */
export const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  const originalUnhandledRejection = (global as any).onunhandledrejection;
  (global as any).onunhandledrejection = (event: any) => {
    try {
      const error = event?.reason || event;
      
      if (isNativeModuleError(error)) {
        console.warn('Global: Suppressed native module error in promise rejection:', error?.message || error);
        event?.preventDefault?.();
        return;
      }
      
      console.error('Global: Unhandled promise rejection:', error);
      
      if (originalUnhandledRejection) {
        originalUnhandledRejection(event);
      }
    } catch (handlerError) {
      console.error('Global: Error in unhandled rejection handler:', handlerError);
    }
  };

  // Handle global errors
  const originalError = (global as any).onerror;
  (global as any).onerror = (message: any, source?: string, lineno?: number, colno?: number, error?: any) => {
    try {
      if (isNativeModuleError(error)) {
        console.warn('Global: Suppressed native module error:', message || error?.message);
        return true; // Prevent default error handling
      }
      
      console.error('Global: Unhandled error:', message, error);
      
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      
      return false;
    } catch (handlerError) {
      console.error('Global: Error in error handler:', handlerError);
      return false;
    }
  };

  // React Native specific error handler
  if (typeof ErrorUtils !== 'undefined') {
    const originalGlobalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      try {
        if (isNativeModuleError(error)) {
          console.warn('Global: Suppressed native module error in React Native:', error?.message);
          // Don't call original handler for native module errors
          return;
        }
        
        console.error('Global: React Native error:', error, 'isFatal:', isFatal);
        
        if (originalGlobalHandler) {
          originalGlobalHandler(error, isFatal);
        }
      } catch (handlerError) {
        console.error('Global: Error in React Native error handler:', handlerError);
      }
    });
  }
};

import { Platform, Dimensions, AppState, AppStateStatus } from 'react-native';

let platformOS: string = 'unknown';

try {
  platformOS = Platform.OS || 'unknown';
} catch {
  // Ignore platform access errors
}

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
 * Checks if running on Android
 */
export const isAndroid = (): boolean => {
  try {
    return Platform.OS === 'android';
  } catch {
    return false;
  }
};

/**
 * Checks if running on web
 */
export const isWeb = (): boolean => {
  try {
    return Platform.OS === 'web';
  } catch {
    return false;
  }
};

/**
 * Gets safe dimensions that work on all platforms
 */
export const getSafeDimensions = (): { width: number; height: number } => {
  try {
    const { width, height } = Dimensions.get('window');
    return { 
      width: width || 375, 
      height: height || 812 
    };
  } catch {
    return { width: 375, height: 812 };
  }
};

/**
 * Checks if the app is in foreground
 */
export const isAppActive = (): boolean => {
  try {
    return AppState.currentState === 'active';
  } catch {
    return true;
  }
};

/**
 * Checks if an error is a network/connectivity error
 */
export const isNetworkError = (error: any): boolean => {
  try {
    const message = error?.message || '';
    const name = error?.name || '';
    const errorString = `${message} ${name}`.toLowerCase();
    
    return (
      errorString.includes('network') ||
      errorString.includes('fetch') ||
      errorString.includes('connection') ||
      errorString.includes('timeout') ||
      errorString.includes('econnrefused') ||
      errorString.includes('enotfound') ||
      errorString.includes('cors') ||
      errorString.includes('offline') ||
      errorString.includes('internet')
    );
  } catch {
    return false;
  }
};

/**
 * Checks if an error is recoverable
 */
export const isRecoverableError = (error: any): boolean => {
  try {
    if (isNativeModuleError(error)) return true;
    if (isNetworkError(error)) return true;
    
    const message = error?.message || '';
    const errorString = message.toLowerCase();
    
    return (
      errorString.includes('timeout') ||
      errorString.includes('temporary') ||
      errorString.includes('retry') ||
      errorString.includes('rate limit') ||
      errorString.includes('quota')
    );
  } catch {
    return false;
  }
};

/**
 * Gets user-friendly error message
 */
export const getUserFriendlyMessage = (error: any): string => {
  try {
    if (isNetworkError(error)) {
      return 'Connection issue. Please check your internet and try again.';
    }
    
    if (isNativeModuleError(error)) {
      return 'A feature is not available on this device. Please try again.';
    }
    
    const message = error?.message || '';
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('permission')) {
      return 'Permission required. Please grant the necessary permissions.';
    }
    
    if (lowerMessage.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    if (lowerMessage.includes('quota') || lowerMessage.includes('limit')) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    
    return 'Something went wrong. Please try again.';
  } catch {
    return 'An unexpected error occurred.';
  }
};

let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let currentAppState: AppStateStatus = 'active';

/**
 * Global error handler for unhandled errors
 */
export const setupGlobalErrorHandlers = () => {
  try {
    // Track app state for better error handling
    try {
      if (!appStateSubscription) {
        currentAppState = AppState.currentState || 'active';
        appStateSubscription = AppState.addEventListener('change', (nextState) => {
          currentAppState = nextState;
        });
      }
    } catch {
      currentAppState = 'active';
    }

    // Handle unhandled promise rejections
    const originalUnhandledRejection = (global as any).onunhandledrejection;
    (global as any).onunhandledrejection = (event: any) => {
      try {
        const error = event?.reason || event;
        
        // Suppress errors when app is in background
        if (currentAppState !== 'active') {
          console.log('Global: Suppressing error while app in background');
          event?.preventDefault?.();
          return;
        }
        
        if (isNativeModuleError(error)) {
          console.warn('Global: Suppressed native module error in promise rejection:', error?.message || error);
          event?.preventDefault?.();
          return;
        }
        
        if (isNetworkError(error)) {
          console.warn('Global: Network error (non-fatal):', error?.message || error);
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
        // Suppress errors when app is in background
        if (currentAppState !== 'active') {
          return true;
        }
        
        if (isNativeModuleError(error)) {
          console.warn('Global: Suppressed native module error:', message || error?.message);
          return true;
        }
        
        if (isNetworkError(error)) {
          console.warn('Global: Network error (non-fatal):', message || error?.message);
          return true;
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

    // React Native specific error handler - safely check for ErrorUtils
    try {
      const errorUtils = typeof ErrorUtils !== 'undefined' ? ErrorUtils : 
                         (typeof global !== 'undefined' && (global as any).ErrorUtils) ? (global as any).ErrorUtils : null;
      
      if (errorUtils && typeof errorUtils.getGlobalHandler === 'function' && typeof errorUtils.setGlobalHandler === 'function') {
        const originalGlobalHandler = errorUtils.getGlobalHandler();
        errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
          try {
            if (!isFatal && isRecoverableError(error)) {
              console.warn('Global: Recoverable error suppressed:', error?.message);
              return;
            }
            
            if (isNativeModuleError(error)) {
              console.warn('Global: Suppressed native module error in React Native:', error?.message);
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
    } catch (euError) {
      console.warn('Global: Failed to set up ErrorUtils handler:', euError);
    }

    // Web-specific error handling
    if (platformOS === 'web' && typeof window !== 'undefined') {
      try {
        window.addEventListener('error', (event) => {
          if (isNativeModuleError(event.error) || isNetworkError(event.error)) {
            event.preventDefault();
            return;
          }
        });
        
        window.addEventListener('unhandledrejection', (event) => {
          if (isNativeModuleError(event.reason) || isNetworkError(event.reason)) {
            event.preventDefault();
            return;
          }
        });
      } catch {
        // Ignore web handler setup errors
      }
    }

    console.log('Global error handlers set up successfully for platform:', platformOS);
  } catch (setupError) {
    console.warn('Global: Failed to set up error handlers:', setupError);
  }
};

/**
 * Cleanup global error handlers
 */
export const cleanupGlobalErrorHandlers = () => {
  try {
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
  } catch {
    // Ignore cleanup errors
  }
};

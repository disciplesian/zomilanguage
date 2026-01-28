import { Platform, Dimensions, AppState, AppStateStatus } from 'react-native';

let platformOS: string = 'unknown';

try {
  platformOS = Platform?.OS || 'unknown';
} catch {
  platformOS = 'unknown';
}

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
      // Ignore
    }
    
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.indexOf('macintosh') !== -1 || ua.indexOf('mac os') !== -1) {
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

const nativeModuleKeywords = [
  'turbomodule',
  'nsexception',
  'native module',
  'nativemodules',
  'turbomodulemanager',
  'rctbridge',
  'rctmodule',
  'hermes',
  'dictpropertymap',
  'hiddenclass',
  'exc_bad_access',
  'sigsegv',
  'kern_invalid_address',
  'convertnsexceptiontojserror',
  'objcturbomodule',
  'performvoidmethodinvocation'
];

export const isNativeModuleError = (error: any): boolean => {
  try {
    if (!error) return false;
    
    const message = String(error?.message || '').toLowerCase();
    const name = String(error?.name || '').toLowerCase();
    const stack = String(error?.stack || '').toLowerCase();
    
    for (let i = 0; i < nativeModuleKeywords.length; i++) {
      const keyword = nativeModuleKeywords[i];
      if (message.indexOf(keyword) !== -1 || 
          name.indexOf(keyword) !== -1 || 
          stack.indexOf(keyword) !== -1) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
};

export const safeNativeCall = async <T>(
  fn: () => Promise<T>,
  fallback: T,
  errorMessage?: string
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message || '';
    
    if (isNativeModuleError(error)) {
      console.warn(errorMessage || 'Native module call failed (suppressed):', errorMsg);
      return fallback;
    }
    
    console.warn(errorMessage || 'Function call failed:', errorMsg);
    return fallback;
  }
};

export const safeNativeCallSync = <T>(
  fn: () => T,
  fallback: T,
  errorMessage?: string
): T => {
  try {
    return fn();
  } catch (error: any) {
    const errorMsg = error?.message || '';
    
    if (isNativeModuleError(error)) {
      console.warn(errorMessage || 'Native module call failed (suppressed):', errorMsg);
      return fallback;
    }
    
    console.warn(errorMessage || 'Function call failed:', errorMsg);
    return fallback;
  }
};

export const isAndroid = (): boolean => {
  try {
    return Platform.OS === 'android';
  } catch {
    return false;
  }
};

export const isWeb = (): boolean => {
  try {
    return Platform.OS === 'web';
  } catch {
    return false;
  }
};

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

export const isAppActive = (): boolean => {
  try {
    return AppState.currentState === 'active';
  } catch {
    return true;
  }
};

const networkKeywords = [
  'network',
  'fetch',
  'connection',
  'timeout',
  'econnrefused',
  'enotfound',
  'cors',
  'offline',
  'internet'
];

export const isNetworkError = (error: any): boolean => {
  try {
    if (!error) return false;
    
    const message = String(error?.message || '').toLowerCase();
    const name = String(error?.name || '').toLowerCase();
    const combined = message + ' ' + name;
    
    for (let i = 0; i < networkKeywords.length; i++) {
      if (combined.indexOf(networkKeywords[i]) !== -1) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
};

export const isRecoverableError = (error: any): boolean => {
  try {
    if (isNativeModuleError(error)) return true;
    if (isNetworkError(error)) return true;
    
    const message = String(error?.message || '').toLowerCase();
    
    return (
      message.indexOf('timeout') !== -1 ||
      message.indexOf('temporary') !== -1 ||
      message.indexOf('retry') !== -1 ||
      message.indexOf('rate limit') !== -1 ||
      message.indexOf('quota') !== -1
    );
  } catch {
    return false;
  }
};

export const getUserFriendlyMessage = (error: any): string => {
  try {
    if (isNetworkError(error)) {
      return 'Connection issue. Please check your internet and try again.';
    }
    
    if (isNativeModuleError(error)) {
      return 'A feature is not available on this device. Please try again.';
    }
    
    const message = String(error?.message || '').toLowerCase();
    
    if (message.indexOf('permission') !== -1) {
      return 'Permission required. Please grant the necessary permissions.';
    }
    
    if (message.indexOf('timeout') !== -1) {
      return 'Request timed out. Please try again.';
    }
    
    if (message.indexOf('quota') !== -1 || message.indexOf('limit') !== -1) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    
    return 'Something went wrong. Please try again.';
  } catch {
    return 'An unexpected error occurred.';
  }
};

let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let currentAppState: AppStateStatus = 'active';
let handlersInitialized = false;

export const setupGlobalErrorHandlers = () => {
  if (handlersInitialized) {
    return;
  }
  handlersInitialized = true;
  
  try {
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

    try {
      const originalUnhandledRejection = (global as any).onunhandledrejection;
      (global as any).onunhandledrejection = (event: any) => {
        try {
          const error = event?.reason || event;
          
          if (currentAppState !== 'active') {
            try { event?.preventDefault?.(); } catch {}
            return;
          }
          
          if (isNativeModuleError(error)) {
            console.warn('Suppressed native module error in promise rejection');
            try { event?.preventDefault?.(); } catch {}
            return;
          }
          
          if (isNetworkError(error)) {
            console.warn('Network error (non-fatal)');
            try { event?.preventDefault?.(); } catch {}
            return;
          }
          
          console.error('Unhandled promise rejection:', error);
          
          if (originalUnhandledRejection) {
            try { originalUnhandledRejection(event); } catch {}
          }
        } catch {
          // Ignore handler errors
        }
      };
    } catch {
      // Ignore setup errors
    }

    try {
      const originalError = (global as any).onerror;
      (global as any).onerror = (message: any, source?: string, lineno?: number, colno?: number, error?: any) => {
        try {
          if (currentAppState !== 'active') {
            return true;
          }
          
          if (isNativeModuleError(error)) {
            console.warn('Suppressed native module error');
            return true;
          }
          
          if (isNetworkError(error)) {
            console.warn('Network error (non-fatal)');
            return true;
          }
          
          console.error('Unhandled error:', message);
          
          if (originalError) {
            try { return originalError(message, source, lineno, colno, error); } catch {}
          }
          
          return false;
        } catch {
          return false;
        }
      };
    } catch {
      // Ignore setup errors
    }

    try {
      let errorUtils: any = null;
      
      if (typeof ErrorUtils !== 'undefined') {
        errorUtils = ErrorUtils;
      } else if (typeof global !== 'undefined' && (global as any).ErrorUtils) {
        errorUtils = (global as any).ErrorUtils;
      }
      
      if (errorUtils && 
          typeof errorUtils.getGlobalHandler === 'function' && 
          typeof errorUtils.setGlobalHandler === 'function') {
        const originalGlobalHandler = errorUtils.getGlobalHandler();
        errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
          try {
            if (!isFatal && isRecoverableError(error)) {
              console.warn('Recoverable error suppressed');
              return;
            }
            
            if (isNativeModuleError(error)) {
              console.warn('Suppressed native module error in React Native');
              return;
            }
            
            console.error('React Native error, isFatal:', isFatal);
            
            if (originalGlobalHandler) {
              try { originalGlobalHandler(error, isFatal); } catch {}
            }
          } catch {
            // Ignore handler errors
          }
        });
      }
    } catch {
      // Ignore ErrorUtils setup errors
    }

    if (platformOS === 'web' && typeof window !== 'undefined') {
      try {
        window.addEventListener('error', (event) => {
          try {
            if (isNativeModuleError(event.error) || isNetworkError(event.error)) {
              event.preventDefault();
            }
          } catch {}
        });
        
        window.addEventListener('unhandledrejection', (event) => {
          try {
            if (isNativeModuleError(event.reason) || isNetworkError(event.reason)) {
              event.preventDefault();
            }
          } catch {}
        });
      } catch {
        // Ignore web handler setup errors
      }
    }

    console.log('Global error handlers set up for platform:', platformOS);
  } catch {
    console.warn('Failed to set up error handlers');
  }
};

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

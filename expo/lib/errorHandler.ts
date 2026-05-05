import { Platform, Dimensions } from 'react-native';

const getPlatformOS = (): string => {
  try {
    return Platform?.OS || 'unknown';
  } catch {
    return 'unknown';
  }
};

export const isTextNodeError = (error: any): boolean => {
  if (!error) return false;
  try {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.indexOf('unexpected text node') !== -1 ||
      message.indexOf('text node cannot be a child') !== -1 ||
      message.indexOf('text strings must be rendered') !== -1 ||
      message.indexOf('rawtext') !== -1
    );
  } catch {
    return false;
  }
};

/**
 * Detects DOM reconciliation errors on web that are typically caused by
 * external DOM mutations (browser translation extensions like Google Translate,
 * Grammarly, password managers) interfering with React's virtual DOM.
 * These are non-fatal and safe to swallow.
 */
export const isDomReconciliationError = (error: any): boolean => {
  if (!error) return false;
  try {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.indexOf("failed to execute 'removechild' on 'node'") !== -1 ||
      message.indexOf("failed to execute 'insertbefore' on 'node'") !== -1 ||
      message.indexOf('the node to be removed is not a child') !== -1 ||
      message.indexOf('the node before which the new node is to be inserted is not a child') !== -1 ||
      message.indexOf('notfounderror') !== -1
    );
  } catch {
    return false;
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
      combined.indexOf('nativemodule') !== -1 ||
      combined.indexOf('exc_bad_access') !== -1 ||
      combined.indexOf('sigsegv') !== -1 ||
      combined.indexOf('jsi') !== -1 ||
      combined.indexOf('bridgeless') !== -1
    );
  } catch {
    return false;
  }
};

export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  try {
    const message = String(error?.message || '').toLowerCase();
    const name = String(error?.name || '').toLowerCase();
    const combined = message + ' ' + name;

    if (error?.code === 'ECONNABORTED' || error?.code === 'ENOTFOUND' || error?.code === 'ERR_NETWORK') {
      return true;
    }

    return (
      combined.indexOf('network') !== -1 ||
      combined.indexOf('fetch') !== -1 ||
      combined.indexOf('timeout') !== -1 ||
      combined.indexOf('offline') !== -1 ||
      combined.indexOf('abort') !== -1 ||
      combined.indexOf('econnrefused') !== -1 ||
      combined.indexOf('econnreset') !== -1 ||
      combined.indexOf('dns') !== -1 ||
      combined.indexOf('socket') !== -1 ||
      combined.indexOf('ssl') !== -1 ||
      combined.indexOf('certificate') !== -1 ||
      combined.indexOf('cors') !== -1
    );
  } catch {
    return false;
  }
};

export const isPermissionError = (error: any): boolean => {
  if (!error) return false;
  try {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.indexOf('permission') !== -1 ||
      message.indexOf('denied') !== -1 ||
      message.indexOf('not allowed') !== -1 ||
      message.indexOf('unauthorized') !== -1
    );
  } catch {
    return false;
  }
};

export const isQuotaError = (error: any): boolean => {
  if (!error) return false;
  try {
    const message = String(error?.message || '').toLowerCase();
    const status = (error as any)?.status || (error as any)?.statusCode;
    
    if (status === 429 || status === 503) return true;
    
    return (
      message.indexOf('quota') !== -1 ||
      message.indexOf('rate limit') !== -1 ||
      message.indexOf('too many requests') !== -1 ||
      message.indexOf('429') !== -1
    );
  } catch {
    return false;
  }
};

export const isStorageError = (error: any): boolean => {
  if (!error) return false;
  try {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.indexOf('storage') !== -1 ||
      message.indexOf('quota exceeded') !== -1 ||
      message.indexOf('disk') !== -1 ||
      message.indexOf('asyncstorage') !== -1
    );
  } catch {
    return false;
  }
};

export const isRecoverableError = (error: any): boolean => {
  return isNativeModuleError(error) || isNetworkError(error) || isQuotaError(error);
};

export const getUserFriendlyMessage = (error: any): string => {
  try {
    if (isNetworkError(error)) {
      return 'Connection issue. Please check your internet and try again.';
    }
    if (isNativeModuleError(error)) {
      return 'A feature is temporarily unavailable. Please try again.';
    }
    if (isQuotaError(error)) {
      return 'Service is temporarily busy. Please wait a moment and try again.';
    }
    if (isPermissionError(error)) {
      return 'Permission required. Please check your device settings.';
    }
    if (isStorageError(error)) {
      return 'Storage issue detected. Please free up space and try again.';
    }

    const message = String(error?.message || '').toLowerCase();
    if (message.indexOf('camera') !== -1) {
      return 'Camera is not available. Please check permissions.';
    }
    if (message.indexOf('microphone') !== -1 || message.indexOf('audio') !== -1) {
      return 'Microphone is not available. Please check permissions.';
    }

    return 'Something went wrong. Please try again.';
  } catch {
    return 'An unexpected error occurred.';
  }
};

export const getErrorSeverity = (error: any): 'low' | 'medium' | 'high' | 'critical' => {
  if (isNetworkError(error)) return 'low';
  if (isQuotaError(error)) return 'medium';
  if (isNativeModuleError(error)) return 'medium';
  if (isPermissionError(error)) return 'medium';
  if (isStorageError(error)) return 'high';
  return 'critical';
};

export const safeNativeCall = async <T>(
  fn: () => Promise<T>,
  fallback: T,
  label?: string
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (label) {
      console.warn(`[safeNativeCall:${label}] Failed:`, (error as Error)?.message);
    }
    return fallback;
  }
};

export const safeNativeCallSync = <T>(
  fn: () => T,
  fallback: T,
  label?: string
): T => {
  try {
    return fn();
  } catch (error) {
    if (label) {
      console.warn(`[safeNativeCallSync:${label}] Failed:`, (error as Error)?.message);
    }
    return fallback;
  }
};

export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  fallback?: T
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (fallback !== undefined) {
        resolve(fallback);
      } else {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

export const retryAsync = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
  backoff = true
): Promise<T> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

let webHandlersInstalled = false;
let originalRemoveChild: ((child: any) => any) | null = null;
let originalInsertBefore: ((newNode: any, ref: any) => any) | null = null;
let onErrorListener: ((e: ErrorEvent) => void) | null = null;
let onRejectionListener: ((e: PromiseRejectionEvent) => void) | null = null;

export const setupGlobalErrorHandlers = () => {
  console.log('Error handlers initialized for platform:', getPlatformOS());
  if (getPlatformOS() !== 'web' || webHandlersInstalled) return;
  if (typeof window === 'undefined' || typeof Node === 'undefined') return;
  webHandlersInstalled = true;

  try {
    const proto = Node.prototype as any;
    originalRemoveChild = proto.removeChild;
    originalInsertBefore = proto.insertBefore;

    proto.removeChild = function patchedRemoveChild(child: any) {
      try {
        if (child && child.parentNode !== this) {
          if (child && child.parentNode && typeof originalRemoveChild === 'function') {
            return originalRemoveChild.call(child.parentNode, child);
          }
          return child;
        }
        return originalRemoveChild!.call(this, child);
      } catch (err) {
        if (isDomReconciliationError(err)) {
          return child;
        }
        throw err;
      }
    };

    proto.insertBefore = function patchedInsertBefore(newNode: any, refNode: any) {
      try {
        if (refNode && refNode.parentNode !== this) {
          return originalInsertBefore!.call(this, newNode, null);
        }
        return originalInsertBefore!.call(this, newNode, refNode);
      } catch (err) {
        if (isDomReconciliationError(err)) {
          try { return originalInsertBefore!.call(this, newNode, null); } catch { return newNode; }
        }
        throw err;
      }
    };
  } catch (e) {
    console.warn('DOM patch skipped:', (e as Error)?.message);
  }

  try {
    onErrorListener = (e: ErrorEvent) => {
      if (isDomReconciliationError(e?.error) || isDomReconciliationError({ message: e?.message })) {
        e.preventDefault?.();
        e.stopImmediatePropagation?.();
      }
    };
    onRejectionListener = (e: PromiseRejectionEvent) => {
      if (isDomReconciliationError(e?.reason)) {
        e.preventDefault?.();
      }
    };
    window.addEventListener('error', onErrorListener, true);
    window.addEventListener('unhandledrejection', onRejectionListener);
  } catch {
    // ignore
  }
};

export const cleanupGlobalErrorHandlers = () => {
  console.log('Error handlers cleaned up');
  if (getPlatformOS() !== 'web' || !webHandlersInstalled) return;
  if (typeof window === 'undefined' || typeof Node === 'undefined') return;
  try {
    const proto = Node.prototype as any;
    if (originalRemoveChild) proto.removeChild = originalRemoveChild;
    if (originalInsertBefore) proto.insertBefore = originalInsertBefore;
    if (onErrorListener) window.removeEventListener('error', onErrorListener, true);
    if (onRejectionListener) window.removeEventListener('unhandledrejection', onRejectionListener);
  } catch {
    // ignore
  }
  webHandlersInstalled = false;
};

export const isMacCatalyst = (): boolean => false;
export const isAndroid = (): boolean => getPlatformOS() === 'android';
export const isWeb = (): boolean => getPlatformOS() === 'web';
export const isIOS = (): boolean => getPlatformOS() === 'ios';

export const getSafeDimensions = (): { width: number; height: number } => {
  try {
    const { width, height } = Dimensions.get('window');
    return { width: width || 375, height: height || 812 };
  } catch {
    return { width: 375, height: 812 };
  }
};

export const isAppActive = (): boolean => true;

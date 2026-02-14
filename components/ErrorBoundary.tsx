import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Dimensions, SafeAreaView, AppState, AppStateStatus } from 'react-native';
import { AlertTriangle, RefreshCw, WifiOff, Home } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { isNativeModuleError, isNetworkError, isRecoverableError, getUserFriendlyMessage } from '@/lib/errorHandler';

const getIsTablet = () => {
  try {
    const { width, height } = Dimensions.get('window');
    const maxDim = Math.max(width, height);
    const minDim = Math.min(width, height);
    return minDim >= 600 || maxDim >= 900;
  } catch {
    return false;
  }
};

const getIsWeb = () => {
  try {
    return Platform.OS === 'web';
  } catch {
    return false;
  }
};

const getIsDesktop = () => {
  try {
    if (Platform.OS !== 'web') return false;
    const { width } = Dimensions.get('window');
    return width >= 1024;
  } catch {
    return false;
  }
};

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'root' | 'screen' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 5;
  private lastErrorTime = 0;
  private errorCooldown = 1000;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private mounted = false;
  private autoRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  componentDidMount() {
    this.mounted = true;
    try {
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    } catch {
      console.log('ErrorBoundary: AppState listener setup skipped');
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    try {
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
    } catch {
      // ignore
    }
    if (this.autoRecoveryTimer) {
      clearTimeout(this.autoRecoveryTimer);
      this.autoRecoveryTimer = null;
    }
  }

  handleAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'active' && this.state.hasError && this.mounted) {
      const error = this.state.error;
      if (error && (isNetworkError(error) || isRecoverableError(error))) {
        console.log('ErrorBoundary: Auto-recovering on app resume');
        this.handleRetry();
      }
    }
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    if (isNativeModuleError(error)) {
      console.warn('ErrorBoundary: Native module error detected, attempting recovery');
      return { hasError: false, error: null, errorInfo: null };
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isNativeModuleError(error)) {
      console.warn('ErrorBoundary: Native module error caught, suppressing:', error?.message);
      if (this.mounted) {
        this.setState({ hasError: false, error: null, errorInfo: null });
      }
      return;
    }
    
    console.error('ErrorBoundary caught an error:', error?.message);
    console.error('Component stack:', errorInfo?.componentStack);
    
    try {
      console.error('Device context:', {
        platform: Platform.OS,
        version: Platform.Version,
        dimensions: Dimensions.get('window'),
        level: this.props.level || 'unknown',
      });
    } catch {
      console.error('Device context: Unable to retrieve');
    }

    this.props.onError?.(error, errorInfo);
    
    if (this.mounted) {
      this.setState((prev) => ({ 
        errorInfo, 
        errorCount: prev.errorCount + 1 
      }));
    }

    if (isNetworkError(error) || isRecoverableError(error)) {
      this.autoRecoveryTimer = setTimeout(() => {
        if (this.mounted && this.state.hasError) {
          console.log('ErrorBoundary: Attempting auto-recovery for recoverable error');
          this.handleRetry();
        }
      }, 5000);
    }
  }

  handleRetry = () => {
    if (!this.mounted) return;
    
    const now = Date.now();
    if (now - this.lastErrorTime < this.errorCooldown) {
      console.log('ErrorBoundary: Retry cooldown active');
      return;
    }
    this.lastErrorTime = now;
    
    this.retryCount++;
    console.log(`ErrorBoundary: Retry attempt ${this.retryCount}/${this.maxRetries}`);
    
    if (this.retryCount <= this.maxRetries) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    } else {
      console.warn('ErrorBoundary: Max retries reached, resetting counter');
      this.retryCount = 0;
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };

  handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    } else {
      this.retryCount = 0;
      this.setState({ hasError: false, error: null, errorInfo: null, errorCount: 0 });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.state.error && isNativeModuleError(this.state.error)) {
        return this.props.children;
      }
      
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isTablet = getIsTablet();
      const isWeb = getIsWeb();
      const isDesktop = getIsDesktop();
      const isNetwork = this.state.error && isNetworkError(this.state.error);
      const friendlyMessage = this.state.error 
        ? getUserFriendlyMessage(this.state.error) 
        : 'The app encountered an unexpected error. Please try again.';
      const level = this.props.level || 'root';

      return (
        <SafeAreaView 
          style={[
            styles.container, 
            isTablet && styles.containerTablet, 
            isDesktop && styles.containerDesktop,
          ]}
          accessibilityRole="alert"
          accessibilityLabel={isNetwork ? 'Connection issue' : 'Application error'}
        >
          <View style={[
            styles.content, 
            isTablet && styles.contentTablet,
            isDesktop && styles.contentDesktop,
          ]}>
            <View style={[styles.iconContainer, isNetwork && styles.iconContainerNetwork]}>
              {isNetwork ? (
                <WifiOff size={isTablet ? 56 : 48} color={Colors.warning} />
              ) : (
                <AlertTriangle size={isTablet ? 56 : 48} color={Colors.error} />
              )}
            </View>
            
            <Text 
              style={[styles.title, isTablet && styles.titleTablet]}
              accessibilityRole="header"
            >
              {isNetwork ? 'Connection Issue' : 'Something went wrong'}
            </Text>
            
            <Text style={[styles.message, isTablet && styles.messageTablet]}>
              {friendlyMessage}
            </Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.retryButton, isNetwork && styles.retryButtonNetwork]} 
                onPress={this.handleRetry}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Try again"
                accessibilityHint="Attempts to recover from the error"
              >
                <RefreshCw size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              {level === 'root' && (
                <TouchableOpacity 
                  style={styles.reloadButton} 
                  onPress={this.handleReload}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={isWeb ? 'Reload page' : 'Reset app'}
                >
                  <Home size={20} color={Colors.textSecondary} />
                  <Text style={styles.reloadButtonText}>
                    {isWeb ? 'Reload' : 'Reset'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {this.state.errorCount > 2 && (
              <Text style={styles.persistentHint}>
                If this keeps happening, try closing and reopening the app.
              </Text>
            )}

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails} nestedScrollEnabled>
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorText} selectable>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorStack} selectable>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}
            
            <Text style={styles.platformInfo}>
              {Platform.OS} {typeof Platform.Version === 'number' ? `v${Platform.Version}` : Platform.Version}
              {isWeb ? ` • ${typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').pop()?.split('/')[0] || 'browser' : 'web'}` : ''}
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  containerTablet: {
    padding: 40,
  },
  containerDesktop: {
    padding: 60,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  contentTablet: {
    maxWidth: 480,
  },
  contentDesktop: {
    maxWidth: 520,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainerNetwork: {
    backgroundColor: 'rgba(255, 200, 0, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  titleTablet: {
    fontSize: 28,
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  messageTablet: {
    fontSize: 18,
    lineHeight: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonNetwork: {
    backgroundColor: Colors.warning,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  reloadButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  persistentHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    marginTop: 20,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  errorDetails: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    maxHeight: 200,
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  errorStack: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    marginTop: 8,
  },
  platformInfo: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 16,
    textAlign: 'center' as const,
  },
});

export default ErrorBoundary;

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Dimensions, SafeAreaView, AppState, AppStateStatus } from 'react-native';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react-native';
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

// isNativeModuleError is now imported from @/lib/errorHandler

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 5;
  private lastErrorTime = 0;
  private errorCooldown = 1000;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private mounted = false;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  componentDidMount() {
    this.mounted = true;
    try {
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    } catch {
      // Ignore AppState errors
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
      // Ignore cleanup errors
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
    
    if (isNetworkError(error)) {
      console.warn('ErrorBoundary: Network error detected, showing recoverable UI');
      return { hasError: true, error };
    }
    
    if (isRecoverableError(error)) {
      console.warn('ErrorBoundary: Recoverable error detected');
      return { hasError: true, error };
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
    
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    try {
      console.error('Device info:', {
        platform: Platform.OS,
        version: Platform.Version,
        dimensions: Dimensions.get('window'),
      });
    } catch {
      console.error('Device info: Unable to retrieve');
    }
    
    if (this.mounted) {
      this.setState({ errorInfo });
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
      const isNetwork = this.state.error && isNetworkError(this.state.error);
      const friendlyMessage = this.state.error ? getUserFriendlyMessage(this.state.error) : 'The app encountered an unexpected error. Please try again.';

      return (
        <SafeAreaView style={[styles.container, isTablet && styles.containerTablet, isWeb && styles.containerWeb]}>
          <View style={[styles.content, isTablet && styles.contentTablet]}>
            <View style={[styles.iconContainer, isNetwork && styles.iconContainerNetwork]}>
              {isNetwork ? (
                <WifiOff size={48} color={Colors.warning} />
              ) : (
                <AlertTriangle size={48} color={Colors.error} />
              )}
            </View>
            <Text style={[styles.title, isTablet && styles.titleTablet]}>
              {isNetwork ? 'Connection Issue' : 'Something went wrong'}
            </Text>
            <Text style={[styles.message, isTablet && styles.messageTablet]}>
              {friendlyMessage}
            </Text>
            
            <TouchableOpacity 
              style={[styles.retryButton, isNetwork && styles.retryButtonNetwork]} 
              onPress={this.handleRetry}
              activeOpacity={0.7}
            >
              <RefreshCw size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}
            <Text style={styles.platformInfo}>
              {Platform.OS} • {typeof Platform.Version === 'number' ? `v${Platform.Version}` : Platform.Version}
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
  containerWeb: {
    maxWidth: 600,
    alignSelf: 'center' as const,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  contentTablet: {
    maxWidth: 500,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  },
  messageTablet: {
    fontSize: 18,
    lineHeight: 28,
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
    fontWeight: '600',
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
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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

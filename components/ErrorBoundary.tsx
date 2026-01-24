import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { isNativeModuleError } from '@/lib/errorHandler';

const getIsTablet = () => {
  try {
    const { width } = Dimensions.get('window');
    return width >= 768;
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
  private maxRetries = 3;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

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
      this.setState({ hasError: false, error: null, errorInfo: null });
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
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.retryCount++;
    if (this.retryCount <= this.maxRetries) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    } else {
      console.warn('ErrorBoundary: Max retries reached');
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

      return (
        <View style={[styles.container, isTablet && styles.containerTablet]}>
          <View style={[styles.content, isTablet && styles.contentTablet]}>
            <View style={styles.iconContainer}>
              <AlertTriangle size={48} color={Colors.error} />
            </View>
            <Text style={[styles.title, isTablet && styles.titleTablet]}>Something went wrong</Text>
            <Text style={[styles.message, isTablet && styles.messageTablet]}>
              The app encountered an unexpected error. Please try again.
            </Text>
            
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
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
          </View>
        </View>
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
    fontFamily: 'monospace',
    marginTop: 8,
  },
});

export default ErrorBoundary;

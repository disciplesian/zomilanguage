import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, Platform, LogBox, Text } from "react-native";
import Colors from "@/constants/colors";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { DictionaryProvider } from "@/contexts/DictionaryContext";
import { trpc, getTrpcClient } from "@/lib/trpc";

if (Platform.OS !== 'web') {
  try {
    LogBox.ignoreLogs([
      'Non-serializable values were found in the navigation state',
      'ViewPropTypes will be removed',
      'ColorPropType will be removed',
    ]);
  } catch {
    // LogBox not available
  }
}

const getPlatformOS = (): string => {
  try {
    return Platform?.OS || 'unknown';
  } catch {
    return 'unknown';
  }
};

let splashHidden = false;
let splashPrevented = false;

const hideSplashSafe = async () => {
  if (splashHidden) return;
  splashHidden = true;
  
  try {
    const platformOS = getPlatformOS();
    if (platformOS === 'web') return;
    const SplashScreen = await import('expo-splash-screen');
    if (SplashScreen?.hideAsync) {
      await SplashScreen.hideAsync();
    }
  } catch {
    console.log('Splash screen hide skipped');
  }
};

const preventSplashAutoHide = async () => {
  if (splashPrevented) return;
  splashPrevented = true;
  
  try {
    const platformOS = getPlatformOS();
    if (platformOS === 'web') return;
    const SplashScreen = await import('expo-splash-screen');
    if (SplashScreen?.preventAutoHideAsync) {
      await SplashScreen.preventAutoHideAsync();
    }
  } catch {
    console.log('Splash screen prevent auto hide skipped');
  }
};

const setupGlobalErrorHandlers = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const originalOnUnhandled = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      const reason = event?.reason;
      const msg = String(reason?.message || reason || '').toLowerCase();
      if (
        msg.includes('text node') ||
        msg.includes('text strings must be rendered') ||
        msg.includes('rawtext')
      ) {
        event?.preventDefault?.();
        return;
      }
      console.error('[Global] Unhandled promise rejection:', reason);
      if (originalOnUnhandled) {
        return (originalOnUnhandled as any).call(window, event);
      }
    };

    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const msg = String(message || '').toLowerCase();
      if (
        msg.includes('text node') ||
        msg.includes('text strings must be rendered') ||
        msg.includes('rawtext')
      ) {
        return true;
      }
      if (originalOnError) {
        return (originalOnError as any)(message, source, lineno, colno, error);
      }
      return false;
    };
  }

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString?.() || '';
    if (
      message.includes('TurboModule') ||
      message.includes('NativeModule') ||
      message.includes('Require cycle') ||
      message.includes('text node') ||
      message.includes('Text strings must be rendered') ||
      message.includes('Unexpected text node')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
};

try {
  setupGlobalErrorHandlers();
} catch {
  // Silent fail for error handler setup
}

function RootLayoutNav() {
  const theme = useTheme();
  const colors = theme?.colors || Colors;

  return (
    <>
      <StatusBar style="light" />
      <Stack 
        screenOptions={{ 
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' as const },
          animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="about" 
          options={{ 
            title: "About",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="privacy" 
          options={{ 
            title: "Privacy Policy",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="contact" 
          options={{ 
            title: "Contact Support",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="terms" 
          options={{ 
            title: "Terms of Service",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="profile" 
          options={{ 
            title: "Profile",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="feedback" 
          options={{ 
            title: "Feedback",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="pronunciation-guide" 
          options={{ 
            title: "Pronunciation Guide",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="translation-tips" 
          options={{ 
            title: "Translation Tips",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="dictionary-detail" 
          options={{ 
            title: "Word Detail",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="dictionary-favorites" 
          options={{ 
            title: "Favorites",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="dictionary-suggest" 
          options={{ 
            title: "Contribute",
            presentation: "card",
          }} 
        />
        <Stack.Screen 
          name="dictionary-import" 
          options={{ 
            title: "Dictionary Import",
            presentation: "card",
          }} 
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const initStartedRef = useRef(false);

  const queryClient = useMemo(() => {
    try {
      return new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
            retry: (failureCount, error) => {
              if ((error as any)?.status === 404) return false;
              if ((error as any)?.status === 401) return false;
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
            networkMode: 'offlineFirst',
            refetchOnWindowFocus: Platform.OS === 'web',
          },
          mutations: {
            retry: 1,
            networkMode: 'offlineFirst',
          },
        },
      });
    } catch (err) {
      console.error('Failed to create QueryClient:', err);
      return new QueryClient();
    }
  }, []);

  const trpcClient = useMemo(() => {
    try {
      return getTrpcClient();
    } catch (err) {
      console.error('Failed to create tRPC client:', err);
      return getTrpcClient();
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!mountedRef.current || initStartedRef.current) return;
    initStartedRef.current = true;
    
    const initialize = async () => {
      try {
        await preventSplashAutoHide();
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.log('Initialization setup skipped:', err);
      }
      
      if (mountedRef.current) {
        setIsReady(true);
        setTimeout(hideSplashSafe, 100);
      }
    };
    
    initialize().catch((err) => {
      console.error('Initialization error:', err);
      if (mountedRef.current) {
        setInitError(err);
        setIsReady(true);
        hideSplashSafe();
      }
    });
  }, []);

  const handleBoundaryError = useCallback((error: Error) => {
    console.error('[RootLayout] ErrorBoundary caught:', error?.message);
  }, []);

  if (!isReady) {
    return (
      <View style={fallbackStyles.container} accessibilityLabel="Loading application">
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={fallbackStyles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (initError) {
    console.warn('App started with initialization error:', initError.message);
  }

  return (
    <View style={fallbackStyles.flex}>
      <ErrorBoundary level="root" onError={handleBoundaryError}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <UserProfileProvider>
                <DictionaryProvider>
                  <RootLayoutNav />
                </DictionaryProvider>
              </UserProfileProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </ErrorBoundary>
    </View>
  );
}

const fallbackStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  flex: {
    flex: 1,
  },
});

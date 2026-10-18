import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, Platform, LogBox, Text } from "react-native";
import Colors from "@/constants/colors";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { TranslationCacheProvider } from "@/contexts/TranslationCacheContext";
import { GlossaryProvider } from "@/contexts/GlossaryContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { trpc, getTrpcClient } from "@/lib/trpc";
import { setupGlobalErrorHandlers } from "@/lib/errorHandler";

setupGlobalErrorHandlers();

if (Platform.OS !== 'web') {
  try {
    LogBox.ignoreLogs([
      'Non-serializable values were found in the navigation state',
      'ViewPropTypes will be removed',
      'ColorPropType will be removed',
    ]);
  } catch {
  }
}

let splashHidden = false;

const hideSplashSafe = async () => {
  if (splashHidden) return;
  splashHidden = true;
  try {
    if (Platform.OS === 'web') return;
    const SplashScreen = await import('expo-splash-screen');
    if (SplashScreen?.hideAsync) {
      await SplashScreen.hideAsync();
    }
  } catch {
    console.log('Splash screen hide skipped');
  }
};

const initSplash = () => {
  try {
    if (Platform.OS === 'web') return;
    import('expo-splash-screen').then(SplashScreen => {
      SplashScreen?.preventAutoHideAsync?.();
    }).catch(() => {});
  } catch {
  }
};
initSplash();

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString?.() || '';
    if (
      message.includes('TurboModule') ||
      message.includes('NativeModule') ||
      message.includes('Require cycle') ||
      message.includes('text node') ||
      message.includes('Text strings must be rendered') ||
      message.includes('Unexpected text node') ||
      message.includes("Failed to execute 'removeChild' on 'Node'") ||
      message.includes("Failed to execute 'insertBefore' on 'Node'") ||
      message.includes('The node to be removed is not a child')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
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
          name="feedback" 
          options={{ 
            title: "Feedback",
            presentation: "card",
          }} 
        />
        <Stack.Screen
          name="release"
          options={{
            title: "Store Release",
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

      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const mountedRef = useRef(true);
  const initStartedRef = useRef(false);

  const queryClient = useMemo(() => {
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
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        },
        mutations: {
          retry: 1,
          networkMode: 'offlineFirst',
        },
      },
    });
  }, []);

  const trpcClient = useMemo(() => getTrpcClient(), []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    setIsReady(true);
    hideSplashSafe();
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

  return (
    <View style={fallbackStyles.flex}>
      <ErrorBoundary level="root" onError={handleBoundaryError}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <UserProfileProvider>
                <TranslationCacheProvider>
                  <GlossaryProvider>
                    <AuthProvider>
                      <SyncProvider>
                        <RootLayoutNav />
                      </SyncProvider>
                    </AuthProvider>
                  </GlossaryProvider>
                </TranslationCacheProvider>
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

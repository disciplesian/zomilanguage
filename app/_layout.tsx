import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { trpc, getTrpcClient } from "@/lib/trpc";
import { setupGlobalErrorHandlers, safeNativeCall, safeNativeCallSync } from "@/lib/errorHandler";

// Setup global error handlers as early as possible
if (typeof global !== 'undefined') {
  try {
    setupGlobalErrorHandlers();
  } catch (error) {
    console.warn('Failed to setup global error handlers:', error);
  }
}

let splashHidden = false;

const hideSplashSafe = async () => {
  if (splashHidden) return;
  splashHidden = true;
  try {
    if (SplashScreen && typeof SplashScreen.hideAsync === 'function') {
      await safeNativeCall(
        async () => SplashScreen.hideAsync(),
        undefined,
        'SplashScreen.hideAsync'
      );
    }
  } catch (error) {
    // Ignore errors - splash screen hiding is not critical
    console.warn('Failed to hide splash screen:', error);
  }
};

// Safely prevent auto-hide splash screen
try {
  if (SplashScreen && typeof SplashScreen.preventAutoHideAsync === 'function') {
    safeNativeCall(
      async () => SplashScreen.preventAutoHideAsync(),
      undefined,
      'SplashScreen.preventAutoHideAsync'
    ).catch(() => {});
  }
} catch {
  // Ignore - not critical
}

function RootLayoutNav() {
  let colors: typeof Colors = Colors;
  try {
    const theme = useTheme();
    if (theme?.colors) {
      colors = { ...Colors, ...theme.colors };
    }
  } catch {
    // Use default colors
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack 
        screenOptions={{ 
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' as const },
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

      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const mountedRef = useRef(true);

  const queryClient = useMemo(() => {
    try {
      return new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: 1,
          },
        },
      });
    } catch {
      return new QueryClient();
    }
  }, []);

  const trpcClient = useMemo(() => {
    return safeNativeCallSync(
      () => {
        try {
          return getTrpcClient();
        } catch (error) {
          console.warn('RootLayout: tRPC client creation failed:', error);
          setHasError(true);
          return null;
        }
      },
      null,
      'tRPC client creation'
    );
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setIsReady(true);
        setTimeout(hideSplashSafe, 100);
      }
    }, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  if (!isReady) {
    return (
      <View style={fallbackStyles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  
  if (hasError || !trpcClient) {
    return (
      <View style={fallbackStyles.container}>
        <Text style={fallbackStyles.errorTitle}>Connection Error</Text>
        <Text style={fallbackStyles.errorText}>Unable to connect. Please restart the app.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ErrorBoundary>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <UserProfileProvider>
                <RootLayoutNav />
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
  errorTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.error,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

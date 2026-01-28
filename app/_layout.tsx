import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { trpc, getTrpcClient } from "@/lib/trpc";

let SplashScreen: typeof import('expo-splash-screen') | null = null;
let setupGlobalErrorHandlers: (() => void) | null = null;
let splashHidden = false;
let errorHandlersInitialized = false;

const initializeModules = async () => {
  try {
    if (!SplashScreen) {
      SplashScreen = await import('expo-splash-screen');
    }
  } catch (e) {
    console.warn('SplashScreen module not available:', e);
  }
  
  try {
    if (!setupGlobalErrorHandlers) {
      const errorHandler = await import('@/lib/errorHandler');
      setupGlobalErrorHandlers = errorHandler.setupGlobalErrorHandlers;
    }
  } catch (e) {
    console.warn('Error handler module not available:', e);
  }
};

const initErrorHandlers = () => {
  if (errorHandlersInitialized) return;
  errorHandlersInitialized = true;
  
  try {
    if (setupGlobalErrorHandlers) {
      setupGlobalErrorHandlers();
    }
  } catch (error) {
    console.warn('Failed to setup global error handlers:', error);
  }
};

const hideSplashSafe = async () => {
  if (splashHidden) return;
  splashHidden = true;
  
  try {
    if (SplashScreen && typeof SplashScreen.hideAsync === 'function') {
      await SplashScreen.hideAsync();
    }
  } catch (error) {
    console.warn('Failed to hide splash screen:', error);
  }
};

const preventSplashAutoHide = async () => {
  try {
    await initializeModules();
    if (SplashScreen && typeof SplashScreen.preventAutoHideAsync === 'function') {
      await SplashScreen.preventAutoHideAsync();
    }
  } catch {
    // Ignore - not critical
  }
};

preventSplashAutoHide().catch(() => {})

function RootLayoutNav() {
  const theme = useTheme();
  const colors = theme?.colors ? { ...Colors, ...theme.colors } : Colors;

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
            networkMode: 'offlineFirst',
          },
          mutations: {
            retry: 1,
            networkMode: 'offlineFirst',
          },
        },
      });
    } catch (error) {
      console.warn('RootLayout: QueryClient creation failed:', error);
      return new QueryClient();
    }
  }, []);

  const trpcClient = useMemo(() => {
    try {
      console.log('RootLayout: Creating tRPC client...');
      const client = getTrpcClient();
      console.log('RootLayout: tRPC client created successfully');
      return client;
    } catch (error) {
      console.warn('RootLayout: tRPC client creation failed, using fallback:', error);
      return getTrpcClient();
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    
    initErrorHandlers();
    
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setIsReady(true);
        setTimeout(hideSplashSafe, 100);
      }
    }, 100);

    return () => {
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
});

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
let splashHidden = false;
let errorHandlersInitialized = false;

const hideSplashSafe = async () => {
  if (splashHidden) return;
  splashHidden = true;
  
  try {
    if (!SplashScreen) {
      const module = await import('expo-splash-screen');
      SplashScreen = module;
    }
    if (SplashScreen && typeof SplashScreen.hideAsync === 'function') {
      await SplashScreen.hideAsync();
    }
  } catch {
    // Ignore splash screen errors
  }
};

const preventSplashAutoHide = async () => {
  try {
    if (!SplashScreen) {
      const module = await import('expo-splash-screen');
      SplashScreen = module;
    }
    if (SplashScreen && typeof SplashScreen.preventAutoHideAsync === 'function') {
      await SplashScreen.preventAutoHideAsync();
    }
  } catch {
    // Ignore - not critical
  }
};

const initErrorHandlers = async () => {
  if (errorHandlersInitialized) return;
  errorHandlersInitialized = true;
  
  try {
    const errorHandler = await import('@/lib/errorHandler');
    if (errorHandler && typeof errorHandler.setupGlobalErrorHandlers === 'function') {
      errorHandler.setupGlobalErrorHandlers();
    }
  } catch {
    // Ignore error handler setup failures
  }
};

preventSplashAutoHide().catch(() => {});

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
    } catch {
      return new QueryClient();
    }
  }, []);

  const trpcClient = useMemo(() => {
    try {
      return getTrpcClient();
    } catch {
      return getTrpcClient();
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    
    const initialize = async () => {
      try {
        await initErrorHandlers();
      } catch {
        // Ignore initialization errors
      }
      
      if (mountedRef.current) {
        setIsReady(true);
        setTimeout(hideSplashSafe, 100);
      }
    };
    
    const timer = setTimeout(initialize, 50);

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
    <View style={fallbackStyles.flex}>
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
  flex: {
    flex: 1,
  },
});

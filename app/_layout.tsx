import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import Colors from "@/constants/colors";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { trpc, getTrpcClient } from "@/lib/trpc";

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
            retry: 1,
            retryDelay: 1000,
            networkMode: 'offlineFirst',
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

  if (!isReady) {
    return (
      <View style={fallbackStyles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (initError) {
    console.warn('App started with initialization error:', initError.message);
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

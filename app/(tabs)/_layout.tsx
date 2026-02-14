import { Tabs } from "expo-router";
import { Languages, Settings, Wrench } from "lucide-react-native";
import React, { useMemo } from "react";
import { Platform, Dimensions } from "react-native";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

const getTabBarHeight = (): number => {
  try {
    if (Platform.OS === 'ios') return 88;
    if (Platform.OS === 'web') {
      const { width } = Dimensions.get('window');
      if (width >= 1024) return 64;
      return 70;
    }
    return 70;
  } catch {
    return 70;
  }
};

const getTabBarPaddingBottom = (): number => {
  try {
    if (Platform.OS === 'ios') return 28;
    if (Platform.OS === 'web') return 8;
    return 10;
  } catch {
    return 10;
  }
};

export default function TabLayout() {
  const theme = useTheme();
  const colors = useMemo(() => theme?.colors ? { ...Colors, ...theme.colors } : Colors, [theme?.colors]);

  const tabBarStyle = useMemo(() => ({
    backgroundColor: colors.tabBar,
    borderTopColor: colors.tabBarBorder,
    borderTopWidth: 1,
    paddingTop: 8,
    height: getTabBarHeight(),
    paddingBottom: getTabBarPaddingBottom(),
    ...(Platform.OS === 'web' ? {
      maxWidth: 960,
      alignSelf: 'center' as const,
      width: '100%' as const,
      borderLeftWidth: 0,
      borderRightWidth: 0,
    } : {}),
  }), [colors.tabBar, colors.tabBarBorder]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600' as const,
          marginTop: 2,
        },
        tabBarHideOnKeyboard: Platform.OS === 'android',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Translate",
          tabBarIcon: ({ color, size }) => <Languages color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="image-translate"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: "Tools",
          tabBarIcon: ({ color, size }) => <Wrench color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="learn-community"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

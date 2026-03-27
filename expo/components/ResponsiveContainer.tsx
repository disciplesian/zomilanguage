import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle, Platform, Dimensions } from 'react-native';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
  padded?: boolean;
  centered?: boolean;
  testID?: string;
}

const getDeviceInfo = () => {
  try {
    const { width } = Dimensions.get('window');
    const isDesktop = Platform.OS === 'web' && width >= 1024;
    const isTablet = (Platform.OS === 'web' && width >= 768 && width < 1024) ||
      (Platform.OS !== 'web' && width >= 600);
    return { width, isDesktop, isTablet };
  } catch {
    return { width: 375, isDesktop: false, isTablet: false };
  }
};

export default function ResponsiveContainer({
  children,
  style,
  maxWidth = 840,
  padded = true,
  centered = true,
  testID,
}: ResponsiveContainerProps) {
  const containerStyle = useMemo(() => {
    const { width, isDesktop, isTablet } = getDeviceInfo();

    const dynamicStyle: ViewStyle = {
      flex: 1,
      width: '100%',
    };

    if (centered && (isDesktop || isTablet)) {
      dynamicStyle.maxWidth = isDesktop ? maxWidth : Math.min(maxWidth, 640);
      dynamicStyle.alignSelf = 'center';
    }

    if (padded) {
      if (isDesktop) {
        dynamicStyle.paddingHorizontal = Math.max(32, (width - maxWidth) / 2);
      } else if (isTablet) {
        dynamicStyle.paddingHorizontal = 24;
      } else {
        dynamicStyle.paddingHorizontal = 20;
      }
    }

    return dynamicStyle;
  }, [maxWidth, padded, centered]);

  return (
    <View style={[styles.base, containerStyle, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});

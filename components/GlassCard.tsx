import React from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'cyan' | 'pink' | 'yellow' | 'purple' | 'green';
  glow?: boolean;
  elevated?: boolean;
}

export default function GlassCard({ 
  children, 
  style, 
  variant = 'default',
  glow = false,
  elevated = false,
}: GlassCardProps) {
  const getGradientColors = (): [string, string] => {
    switch (variant) {
      case 'cyan':
        return ['rgba(0, 229, 255, 0.25)', 'rgba(0, 229, 255, 0.08)'];
      case 'pink':
        return ['rgba(255, 64, 129, 0.25)', 'rgba(255, 64, 129, 0.08)'];
      case 'yellow':
        return ['rgba(255, 234, 0, 0.25)', 'rgba(255, 234, 0, 0.08)'];
      case 'purple':
        return ['rgba(124, 77, 255, 0.25)', 'rgba(124, 77, 255, 0.08)'];
      case 'green':
        return ['rgba(0, 230, 118, 0.25)', 'rgba(0, 230, 118, 0.08)'];
      default:
        return ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.06)'];
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'cyan':
        return Colors.glassCyanBorder;
      case 'pink':
        return Colors.glassPinkBorder;
      case 'yellow':
        return Colors.glassYellowBorder;
      case 'purple':
        return Colors.glassPurpleBorder;
      case 'green':
        return Colors.glassGreenBorder;
      default:
        return Colors.glassBorder;
    }
  };

  const getGlowColor = () => {
    switch (variant) {
      case 'cyan':
        return Colors.glassCyanGlow;
      case 'pink':
        return Colors.glassPinkGlow;
      case 'yellow':
        return Colors.glassYellowGlow;
      case 'purple':
        return Colors.glassPurpleGlow;
      case 'green':
        return Colors.glassGreenGlow;
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  };

  const getShadowStyle = (): ViewStyle => {
    if (Platform.OS === 'ios') {
      if (elevated) {
        return {
          shadowColor: getGlowColor(),
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
        };
      }
      if (glow) {
        return {
          shadowColor: getGlowColor(),
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        };
      }
    }
    if (Platform.OS === 'android') {
      if (elevated) {
        return { elevation: 12 };
      }
      if (glow) {
        return { elevation: 6 };
      }
    }
    return {};
  };

  return (
    <View style={[styles.container, getShadowStyle(), style]}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          { borderColor: getBorderColor() },
        ]}
      >
        <View style={styles.innerHighlight} />
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    position: 'relative',
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});

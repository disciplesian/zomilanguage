import React from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ViewStyle, 
  TextStyle, 
  ActivityIndicator,
  Platform,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'default' | 'cyan' | 'pink' | 'yellow' | 'purple' | 'green';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export default function GlassButton({ 
  title, 
  onPress, 
  variant = 'default', 
  style, 
  textStyle,
  disabled,
  loading,
  icon,
  size = 'medium',
  fullWidth = false,
}: GlassButtonProps) {
  const getGradientColors = (): [string, string] => {
    switch (variant) {
      case 'cyan':
        return ['rgba(0, 217, 255, 0.5)', 'rgba(0, 217, 255, 0.25)'];
      case 'pink':
        return ['rgba(255, 107, 157, 0.5)', 'rgba(255, 107, 157, 0.25)'];
      case 'yellow':
        return ['rgba(255, 217, 61, 0.5)', 'rgba(255, 217, 61, 0.25)'];
      case 'purple':
        return ['rgba(108, 92, 231, 0.5)', 'rgba(108, 92, 231, 0.25)'];
      case 'green':
        return ['rgba(0, 230, 118, 0.5)', 'rgba(0, 230, 118, 0.25)'];
      default:
        return ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.08)'];
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
        return 'rgba(255, 255, 255, 0.15)';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 10,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 28,
          borderRadius: 16,
        };
      default:
        return {
          paddingVertical: 13,
          paddingHorizontal: 22,
          borderRadius: 14,
        };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 13;
      case 'large':
        return 17;
      default:
        return 15;
    }
  };

  const getShadowStyle = (): ViewStyle => {
    if (Platform.OS === 'ios') {
      return {
        shadowColor: getGlowColor(),
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      };
    }
    if (Platform.OS === 'android') {
      return { elevation: 8 };
    }
    return {};
  };

  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.container,
        getShadowStyle(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          { 
            borderColor: getBorderColor(),
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            borderRadius: sizeStyles.borderRadius,
          },
        ]}
      >
        <View style={styles.innerHighlight} />
        {loading ? (
          <ActivityIndicator color={Colors.text} size="small" />
        ) : (
          <View style={styles.content}>
            {icon}
            <Text style={[styles.text, { fontSize: getTextSize() }, textStyle]}>
              {title}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

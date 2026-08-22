import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';

interface TypingDotsProps {
  /** Dot color. */
  color?: string;
  /** Dot diameter in px. */
  dotSize?: number;
}

/**
 * Three pulsing dots that indicate the AI is actively producing text.
 * Used on the Translate screen while the LLM response streams in.
 */
export default function TypingDots({ color = '#FFF200', dotSize = 8 }: TypingDotsProps) {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations = [anim1, anim2, anim3].map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            delay: index * 180,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            delay: 200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [anim1, anim2, anim3]);

  const dotStyle = (anim: Animated.Value): Animated.WithAnimatedValue<ViewStyle> => ({
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: color,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }],
  });

  return (
    <View style={[styles.row, { gap: dotSize * 0.7 }]} accessibilityLabel="AI is translating">
      <Animated.View style={dotStyle(anim1)} />
      <Animated.View style={dotStyle(anim2)} />
      <Animated.View style={dotStyle(anim3)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Home, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import Colors from '@/constants/colors';

interface PageBottomNavProps {
  /** Hide the Back button (e.g. when there's nothing to go back to). */
  hideBack?: boolean;
  /** Override the Home destination (defaults to the Translate tab). */
  homeHref?: string;
  /** Extra style for the outer wrapper. */
  style?: ViewStyle;
}

/**
 * Sticky bottom navigation shown on stack/modal pages so the user always
 * has a one-tap way back Home or to the previous screen — mirrors the
 * tab-bar feel from the front page.
 */
export default function PageBottomNav({
  hideBack = false,
  homeHref = '/(tabs)',
  style,
}: PageBottomNavProps) {
  const haptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
  }, []);

  const handleHome = useCallback(() => {
    haptic();
    try {
      router.replace(homeHref as never);
    } catch {
      try {
        router.push(homeHref as never);
      } catch {}
    }
  }, [haptic, homeHref]);

  const handleBack = useCallback(() => {
    haptic();
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(homeHref as never);
      }
    } catch {
      try {
        router.replace(homeHref as never);
      } catch {}
    }
  }, [haptic, homeHref]);

  return (
    <View style={[styles.wrapper, style]} pointerEvents="box-none">
      <LinearGradient
        colors={['rgba(42,47,69,0)', 'rgba(42,47,69,0.85)', 'rgba(42,47,69,0.98)']}
        style={styles.fade}
        pointerEvents="none"
      />
      <View style={styles.bar}>
        {!hideBack && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.85}
            style={styles.btnOuter}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="page-bottom-nav-back"
          >
            <View style={[styles.btn, styles.btnSecondary]}>
              <ArrowLeft size={18} color={Colors.text} />
              <Text style={styles.btnText}>Back</Text>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleHome}
          activeOpacity={0.9}
          style={styles.btnOuter}
          accessibilityRole="button"
          accessibilityLabel="Go home"
          testID="page-bottom-nav-home"
        >
          <LinearGradient
            colors={['rgba(0,240,255,0.95)', 'rgba(140,92,255,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btn}
          >
            <Home size={18} color={Colors.text} />
            <Text style={styles.btnText}>Home</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Reserve enough scroll padding so the sticky bar never covers content. */
export const PAGE_BOTTOM_NAV_SPACING = Platform.OS === 'ios' ? 110 : 96;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    paddingTop: 10,
    zIndex: 50,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -28,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
  },
  btnOuter: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  btnText: {
    color: Colors.text,
    fontWeight: '700' as const,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});

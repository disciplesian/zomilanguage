import { useState, useEffect, useMemo } from 'react';
import { Dimensions, Platform, ScaledSize, PixelRatio } from 'react-native';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type DeviceCategory = 'phone' | 'tablet' | 'desktop';

interface ResponsiveInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  device: DeviceCategory;
  isPortrait: boolean;
  isLandscape: boolean;
  isSmallPhone: boolean;
  isLargePhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeb: boolean;
  isRetina: boolean;
  pixelRatio: number;
  fontScale: number;
  maxContentWidth: number;
  horizontalPadding: number;
}

const BREAKPOINTS = {
  xs: 0,
  sm: 380,
  md: 768,
  lg: 1024,
  xl: 1440,
} as const;

const getBreakpoint = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

const getDeviceCategory = (width: number, height: number): DeviceCategory => {
  const minDim = Math.min(width, height);
  if (Platform.OS === 'web') {
    if (minDim >= 1024) return 'desktop';
    if (minDim >= 600) return 'tablet';
    return 'phone';
  }
  if (minDim >= 600) return 'tablet';
  return 'phone';
};

const getSafeDimensions = (): ScaledSize => {
  try {
    const dims = Dimensions.get('window');
    if (dims.width > 0 && dims.height > 0) return dims;
  } catch {
    // fallback
  }
  return { width: 375, height: 812, scale: 2, fontScale: 1 };
};

const buildResponsiveInfo = (dims: ScaledSize): ResponsiveInfo => {
  const { width, height } = dims;
  const breakpoint = getBreakpoint(width);
  const device = getDeviceCategory(width, height);
  const pixelRatio = PixelRatio.get() || 2;
  const fontScale = PixelRatio.getFontScale() || 1;

  let maxContentWidth: number;
  let horizontalPadding: number;

  switch (device) {
    case 'desktop':
      maxContentWidth = Math.min(width - 64, 840);
      horizontalPadding = Math.max(32, (width - 840) / 2);
      break;
    case 'tablet':
      maxContentWidth = Math.min(width - 48, 640);
      horizontalPadding = Math.max(24, (width - 640) / 2);
      break;
    default:
      maxContentWidth = width;
      horizontalPadding = 20;
  }

  return {
    width,
    height,
    breakpoint,
    device,
    isPortrait: height >= width,
    isLandscape: width > height,
    isSmallPhone: device === 'phone' && width < 380,
    isLargePhone: device === 'phone' && width >= 414,
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    isWeb: Platform.OS === 'web',
    isRetina: pixelRatio >= 2,
    pixelRatio,
    fontScale,
    maxContentWidth,
    horizontalPadding,
  };
};

export function useResponsive(): ResponsiveInfo {
  const [dims, setDims] = useState<ScaledSize>(getSafeDimensions);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (window.width > 0 && window.height > 0) {
        setDims(window);
      }
    });

    return () => {
      try {
        subscription.remove();
      } catch {
        // ignore
      }
    };
  }, []);

  return useMemo(() => buildResponsiveInfo(dims), [dims]);
}

export function useBreakpointValue<T>(values: Partial<Record<Breakpoint, T>> & { xs: T }): T {
  const { breakpoint } = useResponsive();

  return useMemo(() => {
    const order: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    const startIndex = order.indexOf(breakpoint);

    for (let i = startIndex; i < order.length; i++) {
      const val = values[order[i]];
      if (val !== undefined) return val;
    }
    return values.xs;
  }, [breakpoint, values]);
}

export function normalizeSize(size: number, baseWidth = 375): number {
  try {
    const { width } = getSafeDimensions();
    const scale = Math.min(width / baseWidth, 1.4);
    return Math.round(PixelRatio.roundToNearestPixel(size * scale));
  } catch {
    return size;
  }
}

export function clampFontScale(size: number, maxScale = 1.35): number {
  try {
    const fontScale = Math.min(PixelRatio.getFontScale() || 1, maxScale);
    return Math.round(size * fontScale);
  } catch {
    return size;
  }
}

export const responsive = {
  spacing: (base: number, device: DeviceCategory): number => {
    switch (device) {
      case 'desktop': return base * 1.5;
      case 'tablet': return base * 1.25;
      default: return base;
    }
  },
  fontSize: (base: number, device: DeviceCategory): number => {
    switch (device) {
      case 'desktop': return base * 1.1;
      case 'tablet': return base * 1.08;
      default: return base;
    }
  },
  columns: (device: DeviceCategory): number => {
    switch (device) {
      case 'desktop': return 3;
      case 'tablet': return 2;
      default: return 1;
    }
  },
};

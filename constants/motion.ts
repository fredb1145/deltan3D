import { Platform } from 'react-native';

/**
 * Standard animation timing configurations (in milliseconds).
 */
export const Timings = {
  fade: 200,
  sheet: 350,
  modal: 300,
  hover: 150,
};

/**
 * Standard spring configs for React Native's Animated library.
 * Optimize for native thread execution (useNativeDriver: true).
 */
export const SpringConfigs = {
  // Ultra fast transition with minimal overshoot
  swift: {
    tension: 180,
    friction: 20,
    useNativeDriver: true,
  },
  // Responsive micro-interactions (e.g., button scale compression)
  responsive: {
    tension: 240,
    friction: 18,
    useNativeDriver: true,
  },
  // Soft, smooth overlays
  gentle: {
    tension: 90,
    friction: 16,
    useNativeDriver: true,
  },
  // Slightly bouncy accent feedback
  bouncy: {
    tension: 160,
    friction: 10,
    useNativeDriver: true,
  },
};

/**
 * Corner roundness standards consistent across components.
 */
export const CornerRadii = {
  small: 8,
  medium: 16,
  large: 22,
  extraLarge: 28,
};

/**
 * Platform-independent shadow presets.
 */
export const Shadows = {
  low: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
    default: {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
    },
  }) as any,
  medium: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
    },
    android: {
      elevation: 6,
    },
    default: {
      boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.25)',
    },
  }) as any,
  high: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
    },
    android: {
      elevation: 12,
    },
    default: {
      boxShadow: '0px 12px 20px rgba(0, 0, 0, 0.35)',
    },
  }) as any,
};

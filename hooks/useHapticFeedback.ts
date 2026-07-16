import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Universal Hook for native haptic feedback.
 * Fails gracefully on unsupported platforms (like Web).
 */
export function useHapticFeedback() {
  const triggerSelection = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Fail silently on devices without haptic motors
    }
  };

  const triggerLightImpact = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fail silently
    }
  };

  const triggerMediumImpact = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Fail silently
    }
  };

  const triggerHeavyImpact = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Fail silently
    }
  };

  const triggerSuccess = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Fail silently
    }
  };

  const triggerWarning = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Fail silently
    }
  };

  const triggerError = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Fail silently
    }
  };

  return {
    triggerSelection,
    triggerLightImpact,
    triggerMediumImpact,
    triggerHeavyImpact,
    triggerSuccess,
    triggerWarning,
    triggerError,
  };
}

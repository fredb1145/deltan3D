import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SpringConfigs } from '../../constants/motion';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export interface MotionButtonProps extends Omit<PressableProps, 'style'> {
  children?: React.ReactNode | string;
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  loading?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'success' | 'none';
}

export default function MotionButton({
  children,
  variant = 'primary',
  style,
  textStyle,
  loading = false,
  disabled = false,
  hapticStyle = 'light',
  onPressIn,
  onPressOut,
  onPress,
  ...props
}: MotionButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const { triggerLightImpact, triggerMediumImpact, triggerHeavyImpact, triggerSuccess } = useHapticFeedback();

  const handlePressIn = (event: any) => {
    onPressIn?.(event);

    // Apply scale compression on iOS/Web to simulate premium physical buttons
    if (Platform.OS !== 'android') {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        ...SpringConfigs.responsive,
      }).start();
    }
  };

  const handlePressOut = (event: any) => {
    onPressOut?.(event);

    if (Platform.OS !== 'android') {
      Animated.spring(scaleAnim, {
        toValue: 1.0,
        ...SpringConfigs.responsive,
      }).start();
    }
  };

  const handlePress = (event: any) => {
    if (disabled || loading) return;

    // Trigger haptics
    switch (hapticStyle) {
      case 'light':
        triggerLightImpact();
        break;
      case 'medium':
        triggerMediumImpact();
        break;
      case 'heavy':
        triggerHeavyImpact();
        break;
      case 'success':
        triggerSuccess();
        break;
      default:
        break;
    }

    onPress?.(event);
  };

  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isText = variant === 'text';
  const isDanger = variant === 'danger';

  // Base Styles
  const buttonStyles: ViewStyle[] = [
    styles.base,
    isPrimary && styles.primary,
    isSecondary && styles.secondary,
    isText && styles.textVariant,
    isDanger && styles.danger,
    disabled && styles.disabled,
  ];

  const textStyles: TextStyle[] = [
    styles.textBase,
    isPrimary && styles.textPrimary,
    isSecondary && styles.textSecondary,
    isText && styles.textTextVariant,
    isDanger && styles.textDanger,
    disabled && styles.textDisabled,
  ];

  // Android ripple configuration
  const androidRipple = Platform.select({
    android: {
      color: isPrimary
        ? 'rgba(13,4,7,0.18)'
        : isDanger
        ? 'rgba(255,255,255,0.18)'
        : 'rgba(201,168,76,0.18)',
      borderless: false,
    },
    default: undefined,
  });

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
        style as any,
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        android_ripple={androidRipple}
        style={({ pressed }) => [
          ...buttonStyles,
          Platform.OS === 'web' && pressed ? { opacity: 0.85 } : null,
        ]}
        {...props}
      >
        <View style={styles.contentRow}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={isPrimary || isDanger ? '#0D0407' : '#C9A84C'}
              style={styles.loader}
            />
          ) : null}

          {typeof children === 'string' ? (
            <Text style={[...textStyles, textStyle as any]} numberOfLines={1}>
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden', // Required for Android ripple boundary
  },
  primary: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  secondary: {
    backgroundColor: 'rgba(26,5,9,0.72)',
    borderColor: 'rgba(201,168,76,0.3)',
  },
  textVariant: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  danger: {
    backgroundColor: '#DF3847',
    borderColor: '#DF3847',
  },
  disabled: {
    opacity: 0.45,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginRight: 8,
  },
  textBase: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  textPrimary: {
    color: '#0D0407',
  },
  textSecondary: {
    color: '#C9A84C',
  },
  textTextVariant: {
    color: '#C9A84C',
  },
  textDanger: {
    color: '#FFFFFF',
  },
  textDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
});

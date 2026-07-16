import React, { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { CornerRadii, Shadows, SpringConfigs } from '../../constants/motion';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export interface MotionCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  hapticStyle?: 'light' | 'medium' | 'none';
}

export default function MotionCard({
  children,
  style,
  onPress,
  hapticStyle = 'light',
}: MotionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { triggerLightImpact, triggerMediumImpact } = useHapticFeedback();
  const [hovered, setHovered] = useState(false);

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      ...SpringConfigs.responsive,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      ...SpringConfigs.responsive,
    }).start();
  };

  const handlePress = () => {
    if (!onPress) return;

    if (hapticStyle === 'light') triggerLightImpact();
    else if (hapticStyle === 'medium') triggerMediumImpact();

    onPress();
  };

  const cardStyles = [
    styles.card,
    onPress ? styles.interactive : null,
    hovered && Platform.OS === 'web' ? styles.hoveredWeb : null,
    style,
  ];

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPressIn={onPress ? handlePressIn : undefined}
        onPressOut={onPress ? handlePressOut : undefined}
        onPress={onPress ? handlePress : undefined}
        onHoverIn={onPress && Platform.OS === 'web' ? () => setHovered(true) : undefined}
        onHoverOut={onPress && Platform.OS === 'web' ? () => setHovered(false) : undefined}
        style={cardStyles as any}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A0509',
    borderRadius: CornerRadii.large,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.16)',
    padding: 20,
    ...Shadows.low,
  },
  interactive: {
    cursor: Platform.select({ web: 'pointer', default: undefined }) as any,
  },
  hoveredWeb: Platform.select({
    web: {
      borderColor: 'rgba(201,168,76,0.35)',
      boxShadow: '0px 8px 16px rgba(201, 168, 76, 0.08)',
      backgroundColor: '#22070C',
    },
    default: {},
  }),
});

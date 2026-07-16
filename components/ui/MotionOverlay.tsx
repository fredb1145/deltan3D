import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SpringConfigs } from '../../constants/motion';

export interface MotionOverlayProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  type?: 'bottom-sheet' | 'dialog';
  style?: StyleProp<ViewStyle>;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MotionOverlay({
  visible,
  onClose,
  children,
  type = 'bottom-sheet',
  style,
}: MotionOverlayProps) {
  const [showModal, setShowModal] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const contentScale = useRef(new Animated.Value(0.92)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      // Animate entry
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0.6,
          duration: 250,
          useNativeDriver: true,
        }),
        type === 'bottom-sheet'
          ? Animated.spring(contentTranslateY, {
              toValue: 0,
              ...SpringConfigs.gentle,
            })
          : Animated.parallel([
              Animated.spring(contentScale, {
                toValue: 1.0,
                ...SpringConfigs.responsive,
              }),
              Animated.timing(contentOpacity, {
                toValue: 1.0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]),
      ]).start();
    } else {
      // Animate exit
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        type === 'bottom-sheet'
          ? Animated.timing(contentTranslateY, {
              toValue: SCREEN_HEIGHT,
              duration: 250,
              useNativeDriver: true,
            })
          : Animated.parallel([
              Animated.timing(contentScale, {
                toValue: 0.92,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(contentOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
              }),
            ]),
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible, type, backdropOpacity, contentTranslateY, contentScale, contentOpacity]);

  if (!showModal) return null;

  return (
    <Modal
      transparent
      visible={showModal}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.container}>
        {/* Animated backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Animated content wrapper */}
        {type === 'bottom-sheet' ? (
          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: contentTranslateY }] },
              style,
            ]}
          >
            {/* Grab handle indicator */}
            <View style={styles.grabHandle} />
            {children}
          </Animated.View>
        ) : (
          <Animated.View
            style={[
              styles.dialog,
              {
                opacity: contentOpacity,
                transform: [{ scale: contentScale }],
              },
              style,
            ]}
          >
            {children}
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A0509',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 38,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  grabHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  dialog: {
    backgroundColor: '#1A0509',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.22)',
    padding: 24,
    width: '88%',
    maxWidth: 420,
  },
});

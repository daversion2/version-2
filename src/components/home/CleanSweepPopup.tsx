import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, FontSizes } from '../../constants/theme';

interface CleanSweepPopupProps {
  visible: boolean;
  bonusPoints: number;
  onComplete: () => void;
}

export const CleanSweepPopup: React.FC<CleanSweepPopupProps> = ({
  visible,
  bonusPoints,
  onComplete,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      opacity.setValue(1);
      scale.setValue(0.5);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.spring(scale, {
            toValue: 1.2,
            friction: 4,
            tension: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        onComplete();
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.label}>Clean Sweep!</Text>
      <View style={styles.divider} />
      <Text style={styles.points}>+{bonusPoints} bonus</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: Colors.white + '40',
    marginVertical: 4,
  },
  points: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.white,
    opacity: 0.9,
  },
});

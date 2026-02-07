import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Colors, Fonts, FontSizes } from '../../constants/theme';

interface PointsPopupProps {
  points: number;
  visible: boolean;
  onComplete?: () => void;
}

export const PointsPopup: React.FC<PointsPopupProps> = ({
  points,
  visible,
  onComplete,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      // Reset values
      translateY.setValue(0);
      opacity.setValue(1);
      scale.setValue(0.5);

      // Run animation sequence
      Animated.parallel([
        // Float up
        Animated.timing(translateY, {
          toValue: -80,
          duration: 1500,
          useNativeDriver: true,
        }),
        // Fade out (delayed)
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        // Scale bounce
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
        onComplete?.();
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
      <Text style={styles.text}>+{points}</Text>
      <Text style={styles.label}>pts</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.white,
  },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.lg,
    color: Colors.white,
    marginLeft: 4,
    opacity: 0.9,
  },
});

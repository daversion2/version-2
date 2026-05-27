import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StepTransitionProps {
  stepKey: string;
  direction: 'forward' | 'backward';
  children: React.ReactNode;
}

export const StepTransition: React.FC<StepTransitionProps> = ({
  stepKey,
  direction,
  children,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const enterFrom = direction === 'forward' ? SCREEN_WIDTH * 0.15 : -SCREEN_WIDTH * 0.15;
    translateX.setValue(enterFrom);
    opacity.setValue(0);
    scale.setValue(0.97);

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        friction: 20,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 20,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepKey]);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX }, { scale }], opacity }]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

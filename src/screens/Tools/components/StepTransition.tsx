import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_DISTANCE = SCREEN_WIDTH * 0.25;

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

  useEffect(() => {
    const enterFrom = direction === 'forward' ? SLIDE_DISTANCE : -SLIDE_DISTANCE;
    translateX.setValue(enterFrom);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepKey]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX }], opacity }]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

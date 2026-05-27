import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { WorksheetSection } from '../../../types';

interface SectionIntroStepProps {
  section: WorksheetSection;
  sectionIndex: number;
  totalSections: number;
  color: string;
}

export const SectionIntroStep: React.FC<SectionIntroStepProps> = ({
  section,
  sectionIndex,
  totalSections,
  color,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconRow, { transform: [{ scale: iconScale }] }]}>
        <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
          <Ionicons name="chatbubble-ellipses" size={24} color={color} />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.contentArea,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.sectionLabel}>
          Part {sectionIndex + 1} of {totalSections}
        </Text>

        <Text style={[styles.title, { color }]}>{section.title}</Text>

        {section.description && (
          <Text style={styles.description}>{section.description}</Text>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },
  iconRow: {
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    alignItems: 'center',
    width: '100%',
  },
  sectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl + 2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
});

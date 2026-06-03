import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { WorksheetTemplate } from '../../../types';

interface IntroStepProps {
  template: WorksheetTemplate;
}

export const IntroStep: React.FC<IntroStepProps> = ({ template }) => {
  const [tipsExpanded, setTipsExpanded] = useState(false);

  const iconScale = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(12)).current;
  const descFade = useRef(new Animated.Value(0)).current;
  const descSlide = useRef(new Animated.Value(12)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    // Icon bounces in
    Animated.spring(iconScale, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
      delay: 100,
    }).start();

    // Title slides in
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(titleFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, friction: 12, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();

    // Description
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(descFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(descSlide, { toValue: 0, friction: 12, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();

    // Card
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(cardSlide, { toValue: 0, friction: 12, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          { backgroundColor: template.color + '15', transform: [{ scale: iconScale }] },
        ]}
      >
        <Ionicons
          name={template.icon as any}
          size={36}
          color={template.color}
        />
      </Animated.View>

      <Animated.Text
        style={[
          styles.title,
          { opacity: titleFade, transform: [{ translateY: titleSlide }] },
        ]}
      >
        {template.name}
      </Animated.Text>

      <Animated.Text
        style={[
          styles.description,
          { opacity: descFade, transform: [{ translateY: descSlide }] },
        ]}
      >
        {template.long_description}
      </Animated.Text>

      <Animated.View
        style={[
          styles.metaRow,
          { opacity: descFade, transform: [{ translateY: descSlide }] },
        ]}
      >
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={Colors.gray} />
          <Text style={styles.metaText}>~{template.estimated_minutes} min</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="flash-outline" size={14} color={Colors.gray} />
          <Text style={styles.metaText}>+2 XP</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.whenToUseCard,
          { borderLeftColor: template.color, opacity: cardFade, transform: [{ translateY: cardSlide }] },
        ]}
      >
        <Text style={styles.whenToUseLabel}>Best used when</Text>
        <Text style={styles.whenToUseText}>{template.when_to_use}</Text>
      </Animated.View>

      {template.tips && template.tips.length > 0 && (
        <Animated.View style={[styles.tipsContainer, { opacity: cardFade }]}>
          <TouchableOpacity
            style={styles.tipsToggle}
            onPress={() => setTipsExpanded(!tipsExpanded)}
            activeOpacity={0.7}
          >
            <Ionicons name="bulb-outline" size={16} color={template.color} />
            <Text style={[styles.tipsToggleText, { color: template.color }]}>Tips before you start</Text>
            <Ionicons
              name={tipsExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={template.color}
            />
          </TouchableOpacity>
          {tipsExpanded && (
            <View style={styles.tipsList}>
              {template.tips.map((tip, i) => (
                <Text key={i} style={styles.tipText}>
                  {'\u2022'} {tip}
                </Text>
              ))}
            </View>
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  whenToUseCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  whenToUseLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  whenToUseText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  tipsContainer: {
    marginTop: Spacing.sm,
  },
  tipsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tipsToggleText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
  },
  tipsList: {
    marginTop: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  tipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
});

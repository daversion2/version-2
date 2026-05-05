import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { WhyIteration } from '../../types';

interface WhyChainProps {
  iterations: WhyIteration[];
  coreWhyReached: boolean;
}

export const WhyChain: React.FC<WhyChainProps> = ({ iterations, coreWhyReached }) => {
  if (iterations.length === 0) return null;

  return (
    <View style={styles.container}>
      {iterations.map((iteration, idx) => {
        const isLast = idx === iterations.length - 1;
        const isCore = isLast && coreWhyReached;

        return (
          <View key={iteration.id} style={styles.iterationRow}>
            {/* Vertical line + dot */}
            <View style={styles.timeline}>
              <View style={[styles.dot, isCore && styles.dotCore]} />
              {!isLast && <View style={styles.line} />}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.question}>{iteration.question}</Text>
              <View style={[styles.answerCard, isCore && styles.answerCardCore]}>
                {isCore && (
                  <View style={styles.coreBadge}>
                    <Ionicons name="star" size={12} color={Colors.primary} />
                    <Text style={styles.coreBadgeText}>CORE WHY</Text>
                  </View>
                )}
                <Text style={[styles.answer, isCore && styles.answerCore]}>
                  {iteration.answer}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: Spacing.xs,
  },
  iterationRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timeline: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary + '40',
    marginTop: 4,
  },
  dotCore: {
    backgroundColor: Colors.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.primary + '25',
    marginTop: 4,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  question: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: 4,
  },
  answerCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  answerCardCore: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  coreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  coreBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  answer: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  answerCore: {
    fontFamily: Fonts.secondaryBold,
  },
});

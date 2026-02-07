import React from 'react';
import { Text, StyleSheet, ScrollView, View } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';

export const HowItWorksScreen: React.FC = () => {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>How the Willpower Bank Works</Text>

      {/* Earning Points */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Earning Points</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>
            {'\u2022'} Complete a challenge: 5-25 points (based on difficulty 1-5)
          </Text>
          <Text style={styles.bullet}>
            {'\u2022'} Complete a habit: 3-6 points (based on difficulty)
          </Text>
          <Text style={styles.bullet}>
            {'\u2022'} Add a reflection: +2 bonus points
          </Text>
          <Text style={styles.bullet}>
            {'\u2022'} Even logging a failed challenge earns 2 points (showing up matters)
          </Text>
          <Text style={styles.bullet}>
            {'\u2022'} Move through levels (1-10) as you stack up points
          </Text>
        </View>
      </Card>

      {/* Streak Multipliers */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Streak Multipliers</Text>
        <Text style={styles.description}>
          Build a streak by completing at least one challenge or habit daily. Multipliers increase your point earnings:
        </Text>
        <View style={styles.tierList}>
          <View style={styles.tierRow}>
            <Text style={styles.tierDays}>Days 1-2</Text>
            <Text style={styles.tierMultiplier}>1.0x</Text>
            <Text style={styles.tierName}>Starting</Text>
          </View>
          <View style={styles.tierRow}>
            <Text style={styles.tierDays}>Days 3-6</Text>
            <Text style={styles.tierMultiplier}>1.2x</Text>
            <Text style={styles.tierName}>Building Momentum</Text>
          </View>
          <View style={styles.tierRow}>
            <Text style={styles.tierDays}>Days 7-13</Text>
            <Text style={styles.tierMultiplier}>1.5x</Text>
            <Text style={styles.tierName}>On Fire</Text>
          </View>
          <View style={styles.tierRow}>
            <Text style={styles.tierDays}>Days 14-29</Text>
            <Text style={styles.tierMultiplier}>1.75x</Text>
            <Text style={styles.tierName}>Unstoppable</Text>
          </View>
          <View style={styles.tierRow}>
            <Text style={styles.tierDays}>Days 30+</Text>
            <Text style={styles.tierMultiplier}>2.0x</Text>
            <Text style={styles.tierName}>Legendary</Text>
          </View>
        </View>
      </Card>

      {/* Suck Factor */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Suck Factor</Text>
        <Text style={styles.description}>
          Measures how hard you're pushing yourself, based on the average difficulty of your challenges.
        </Text>
        <View style={styles.tierList}>
          <View style={styles.suckRow}>
            <Text style={styles.suckTier}>Comfort Zone</Text>
            <Text style={styles.suckDesc}>Starting with manageable challenges</Text>
          </View>
          <View style={styles.suckRow}>
            <Text style={styles.suckTier}>Steady Builder</Text>
            <Text style={styles.suckDesc}>Building strength with balanced challenges</Text>
          </View>
          <View style={styles.suckRow}>
            <Text style={styles.suckTier}>Challenge Seeker</Text>
            <Text style={styles.suckDesc}>Pushing beyond your comfort zone</Text>
          </View>
          <View style={styles.suckRow}>
            <Text style={styles.suckTier}>Limit Pusher</Text>
            <Text style={styles.suckDesc}>Consistently tackling the hardest challenges</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  heading: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.lg,
  },
  card: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  bulletList: {
    gap: Spacing.xs,
  },
  bullet: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 22,
    paddingLeft: Spacing.xs,
  },
  tierList: {
    gap: Spacing.sm,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tierDays: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    width: 80,
  },
  tierMultiplier: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
    width: 50,
  },
  tierName: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
  },
  suckRow: {
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suckTier: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginBottom: 2,
  },
  suckDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
});

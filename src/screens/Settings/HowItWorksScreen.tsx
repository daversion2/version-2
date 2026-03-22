import React from 'react';
import { Text, StyleSheet, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';

export const HowItWorksScreen: React.FC = () => {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Core Concepts */}
      <Text style={styles.heading}>The Three Pillars</Text>
      <Text style={styles.introText}>
        Neuro Nudge gives you three tools to build willpower. Each works differently, and they work best together.
      </Text>

      {/* Challenges */}
      <Card style={styles.card}>
        <View style={styles.pillarHeader}>
          <View style={[styles.pillarIcon, { backgroundColor: Colors.secondary + '15' }]}>
            <Ionicons name="flash" size={22} color={Colors.secondary} />
          </View>
          <View style={styles.pillarHeaderText}>
            <Text style={styles.sectionTitle}>Challenges</Text>
            <Text style={styles.pillarTagline}>Short bursts of discomfort</Text>
          </View>
        </View>
        <Text style={styles.description}>
          A challenge is a single act of willpower — something uncomfortable you commit to doing today. Cold shower, no phone for an hour, talk to a stranger.
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>{'\u2022'} Daily or multi-day (extended challenges up to 30 days)</Text>
          <Text style={styles.bullet}>{'\u2022'} You create them yourself or pick from the library</Text>
          <Text style={styles.bullet}>{'\u2022'} Rate the difficulty (1-5) to earn more points</Text>
          <Text style={styles.bullet}>{'\u2022'} Best for: trying new things and pushing your edge</Text>
        </View>
      </Card>

      {/* Habits */}
      <Card style={styles.card}>
        <View style={styles.pillarHeader}>
          <View style={[styles.pillarIcon, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name="repeat" size={22} color={Colors.primary} />
          </View>
          <View style={styles.pillarHeaderText}>
            <Text style={styles.sectionTitle}>Habits</Text>
            <Text style={styles.pillarTagline}>Consistent daily actions</Text>
          </View>
        </View>
        <Text style={styles.description}>
          A habit is something you want to do regularly — exercise, meditate, read, eat clean. You set a weekly target and track your consistency over time.
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>{'\u2022'} Set a target (e.g. 5x per week) and log completions</Text>
          <Text style={styles.bullet}>{'\u2022'} Build streaks by hitting your weekly target</Text>
          <Text style={styles.bullet}>{'\u2022'} Always running in the background alongside challenges</Text>
          <Text style={styles.bullet}>{'\u2022'} Best for: locking in behaviors you want to keep forever</Text>
        </View>
      </Card>

      {/* Programs */}
      <Card style={styles.card}>
        <View style={styles.pillarHeader}>
          <View style={[styles.pillarIcon, { backgroundColor: '#7B1FA2' + '15' }]}>
            <Ionicons name="map" size={22} color="#7B1FA2" />
          </View>
          <View style={styles.pillarHeaderText}>
            <Text style={styles.sectionTitle}>Programs</Text>
            <Text style={styles.pillarTagline}>Guided multi-week journeys</Text>
          </View>
        </View>
        <Text style={styles.description}>
          A program is a structured plan that prescribes exactly what to do each day for 21-30 days. Think of it as a boot camp — you show up, follow the plan, and level up.
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>{'\u2022'} Each day has a specific challenge, educational content, and tips</Text>
          <Text style={styles.bullet}>{'\u2022'} Two modes: Cold Turkey (full intensity) or Gradual Build (escalating)</Text>
          <Text style={styles.bullet}>{'\u2022'} Grace days let you miss a few days without failing</Text>
          <Text style={styles.bullet}>{'\u2022'} Complete the program to earn a badge and convert activities into habits</Text>
          <Text style={styles.bullet}>{'\u2022'} Best for: breaking specific bad habits with a proven plan</Text>
        </View>
      </Card>

      {/* How they work together */}
      <Card style={{ ...styles.card, borderLeftWidth: 3, borderLeftColor: Colors.primary }}>
        <Text style={styles.sectionTitle}>How They Work Together</Text>
        <Text style={styles.description}>
          Start a program to build momentum with a structured plan. Track your existing habits alongside it. Use challenges to push yourself on days you want an extra edge. When a program ends, its activities become habits — and the cycle continues.
        </Text>
        <Text style={[styles.description, { marginBottom: 0, fontStyle: 'italic' }]}>
          Everything you do earns willpower points, builds your streak, and grows your Willpower Bank.
        </Text>
      </Card>

      {/* Divider */}
      <View style={styles.divider} />

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
  introText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  pillarIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarHeaderText: {
    flex: 1,
  },
  pillarTagline: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
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

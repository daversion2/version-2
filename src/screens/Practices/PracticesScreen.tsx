import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PRACTICE_GROUPS, getPracticesByGroup, Practice } from '../../data/practices';

const PracticeCard: React.FC<{ practice: Practice; color: string }> = ({ practice, color }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
        <Ionicons name={practice.icon as any} size={20} color={color} />
      </View>
      <View style={styles.cardTitleWrap}>
        <Text style={styles.cardTitle}>{practice.name}</Text>
        <Text style={styles.cardTarget}>{practice.suggested_target_per_week}×/week</Text>
      </View>
      <View style={[styles.pill, practice.core ? { backgroundColor: color } : styles.pillOptional]}>
        <Text style={[styles.pillText, practice.core ? { color: Colors.white } : { color: Colors.gray }]}>
          {practice.core ? 'Core' : 'Optional'}
        </Text>
      </View>
    </View>
    <Text style={styles.cardDesc}>{practice.description}</Text>
    <Text style={styles.cardWhy}>{practice.whyItWorks}</Text>
    {!practice.core && practice.optional_reason && (
      <Text style={styles.optionalReason}>{practice.optional_reason}</Text>
    )}
  </View>
);

export const PracticesScreen: React.FC = () => (
  <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.intro}>
      Your daily training. Do these on a regular cadence — small overrides, repeated.
    </Text>

    {PRACTICE_GROUPS.map((group) => (
      <View key={group.id} style={styles.group}>
        <View style={styles.groupHeader}>
          <View style={[styles.groupDot, { backgroundColor: group.color }]} />
          <Text style={styles.groupName}>{group.name}</Text>
        </View>
        <Text style={styles.groupDesc}>{group.description}</Text>
        {getPracticesByGroup(group.id).map((practice) => (
          <PracticeCard key={practice.id} practice={practice} color={group.color} />
        ))}
      </View>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  intro: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.lg,
  },
  group: { marginBottom: Spacing.xl },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  groupDot: { width: 12, height: 12, borderRadius: 6 },
  groupName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  groupDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  cardTarget: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 1 },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  pillOptional: { backgroundColor: Colors.lightGray, borderWidth: 1, borderColor: Colors.border },
  pillText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },
  cardDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: Spacing.sm,
  },
  cardWhy: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  optionalReason: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    marginTop: Spacing.xs,
  },
});

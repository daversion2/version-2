import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { MissionCategory } from '../../data/cravings';

interface Props {
  category: MissionCategory;
  /** e.g. "13:12" — shown in the we've-got-the-timer contract card. */
  timeLeftLabel: string;
  onGo: () => void;
}

/**
 * The pre-departure brief for an off-app mission: one concrete task with a
 * noticing component, and the contract spelled out — phone down, we hold the
 * timer, a ping brings you back.
 */
export const MissionBrief: React.FC<Props> = ({ category, timeLeftLabel, onGo }) => {
  const [variant, setVariant] = useState(0);
  const mission = category.missions[variant % category.missions.length];

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Text style={styles.emoji}>{category.emoji}</Text>
        <Text style={styles.kicker}>YOUR MISSION</Text>
        <Text style={styles.title}>{mission.title}</Text>
        <Text style={styles.sub}>{mission.sub}</Text>
        {mission.ideas && (
          <View style={styles.ideasList}>
            {mission.ideas.map((idea, i) => (
              <View key={i} style={styles.ideaRow}>
                <Text style={styles.ideaBullet}>·</Text>
                <Text style={styles.ideaText}>{idea}</Text>
              </View>
            ))}
          </View>
        )}
        {category.missions.length > 1 && (
          <TouchableOpacity onPress={() => setVariant(variant + 1)}>
            <Text style={styles.shuffle}>↻ Different mission</Text>
          </TouchableOpacity>
        )}

        <View style={styles.pocketCard}>
          <Text style={styles.pocketIcon}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.pocketTitle}>We’ve got the timer — {timeLeftLabel} left</Text>
            <Text style={styles.pocketText}>
              Put the phone in your pocket. A notification will land when the
              wave should have passed, and you’ll log how it went. Coming back
              early is fine too.
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.goButton} onPress={onGo} activeOpacity={0.85}>
        <Text style={styles.goText}>Go — phone down 📵</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  stage: { flex: 1, alignItems: 'center', paddingTop: Spacing.lg },
  emoji: { fontSize: 52, marginBottom: Spacing.md },
  kicker: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: '#FF8A4D',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: Spacing.sm,
  },
  sub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  shuffle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: '#FF8A4D',
    marginTop: Spacing.md,
  },
  ideasList: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  ideaRow: { flexDirection: 'row', gap: Spacing.sm },
  ideaBullet: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: '#FF8A4D',
    lineHeight: 18,
  },
  ideaText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },
  pocketCard: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
    backgroundColor: 'rgba(33,113,128,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(33,113,128,0.4)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
  },
  pocketIcon: { fontSize: 20 },
  pocketTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
    marginBottom: 3,
  },
  pocketText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(160,190,200,0.9)',
    lineHeight: 17,
  },
  goButton: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  goText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});

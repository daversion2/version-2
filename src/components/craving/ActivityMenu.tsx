import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { MISSION_CATEGORIES } from '../../data/cravings';

export type InAppActivityId = 'breathe' | 'learn' | 'ground' | 'name' | 'ride';

const IN_APP_TILES: { id: InAppActivityId; icon: string; name: string; desc: string }[] = [
  { id: 'breathe', icon: '🫁', name: 'Breathe', desc: 'Pick your cadence' },
  { id: 'learn', icon: '🧠', name: 'Learn', desc: 'Your brain right now' },
  { id: 'ground', icon: '🖐', name: 'Ground', desc: '5-4-3-2-1 senses' },
  { id: 'name', icon: '✍️', name: 'Name it', desc: 'Write the trigger' },
];

interface Props {
  onSelectActivity: (id: InAppActivityId) => void;
  onSelectMission: (categoryId: string) => void;
}

/**
 * The while-it-passes menu. "Out in the world" leads — the app doesn't hold
 * the user hostage, and for screen cravings especially, off the phone is the
 * stronger move.
 */
export const ActivityMenu: React.FC<Props> = ({ onSelectActivity, onSelectMission }) => (
  <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
    <Text style={styles.prompt}>While it passes — pick something to do</Text>
    <Text style={styles.promptSub}>
      Anything here beats staring at the clock. You can switch any time.
    </Text>

    <View style={styles.groupLabelRow}>
      <Text style={styles.groupLabel}>OUT IN THE WORLD</Text>
      <Text style={styles.groupHint}> — leave the app, we’ll hold the timer</Text>
    </View>
    <View style={styles.worldGrid}>
      {MISSION_CATEGORIES.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={styles.worldTile}
          onPress={() => onSelectMission(c.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.worldIcon}>{c.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.worldName}>{c.label}</Text>
            <Text style={styles.worldDesc}>{c.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.groupLabelRow}>
      <Text style={styles.groupLabel}>ON YOUR PHONE</Text>
    </View>
    <View style={styles.appGrid}>
      {IN_APP_TILES.map((t) => (
        <TouchableOpacity
          key={t.id}
          style={styles.appTile}
          onPress={() => onSelectActivity(t.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.appIcon}>{t.icon}</Text>
          <Text style={styles.appName}>{t.name}</Text>
          <Text style={styles.appDesc}>{t.desc}</Text>
        </TouchableOpacity>
      ))}
    </View>

    <TouchableOpacity style={styles.justRide} onPress={() => onSelectActivity('ride')}>
      <Text style={styles.justRideText}>
        Or <Text style={styles.justRideBold}>just ride</Text> — watch the wave, no activity
      </Text>
    </TouchableOpacity>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  prompt: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: '#FFFFFF',
    marginTop: Spacing.sm,
  },
  promptSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
    lineHeight: 17,
  },
  groupLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  groupLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.45)',
  },
  groupHint: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },
  worldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  worldTile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,91,2,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,91,2,0.25)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 4,
  },
  worldIcon: { fontSize: 20 },
  worldName: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: '#FFFFFF',
  },
  worldDesc: {
    fontFamily: Fonts.secondary,
    fontSize: 9.5,
    color: 'rgba(220,170,140,0.8)',
    lineHeight: 12,
    marginTop: 1,
  },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  appTile: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.sm,
  },
  appIcon: { fontSize: 20, marginBottom: 4 },
  appName: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: '#FFFFFF',
  },
  appDesc: {
    fontFamily: Fonts.secondary,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 1,
    textAlign: 'center',
  },
  justRide: {
    marginTop: Spacing.sm + 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 4,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  justRideText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.5)',
  },
  justRideBold: {
    fontFamily: Fonts.secondaryBold,
    color: 'rgba(255,255,255,0.75)',
  },
});

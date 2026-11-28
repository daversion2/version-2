import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { MISSION_CATEGORIES } from '../../data/cravings';
import { Copy } from '../common/Copy';

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
    <Copy id="craving.menu.prompt" style={styles.prompt}>While it passes — pick something to do</Copy>
    <Copy id="craving.menu.promptSub" style={styles.promptSub}>
      Anything here beats staring at the clock. You can switch any time.
    </Copy>

    <View style={styles.groupLabelRow}>
      <Copy id="craving.menu.outLabel" style={styles.groupLabel}>OUT IN THE WORLD</Copy>
      <Copy id="craving.menu.outHint" style={styles.groupHint}> — leave the app, we’ll hold the timer</Copy>
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
      <Copy id="craving.menu.phoneLabel" style={styles.groupLabel}>ON YOUR PHONE</Copy>
    </View>
    <View style={styles.appGrid}>
      {IN_APP_TILES.map((tile) => (
        <TouchableOpacity
          key={tile.id}
          style={styles.appTile}
          onPress={() => onSelectActivity(tile.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.appIcon}>{tile.icon}</Text>
          <Copy id={`craving.menu.tile.${tile.id}.name`} style={styles.appName}>{tile.name}</Copy>
          <Copy id={`craving.menu.tile.${tile.id}.desc`} style={styles.appDesc}>{tile.desc}</Copy>
        </TouchableOpacity>
      ))}
    </View>

    <TouchableOpacity style={styles.justRide} onPress={() => onSelectActivity('ride')}>
      <Copy id="craving.menu.justRide" style={styles.justRideText} boldStyle={styles.justRideBold}>
        Or **just ride** — watch the wave, no activity
      </Copy>
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

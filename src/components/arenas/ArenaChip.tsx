import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ArenaId } from '../../types';
import { getArena } from '../../constants/arenas';

interface ArenaChipProps {
  arenaId?: ArenaId | null;
  size?: 'sm' | 'md';
}

/**
 * Colored pill showing which override-training arena an item belongs to.
 * Renders nothing when there is no arena (e.g. off-thesis / untagged items),
 * which itself is a useful visual signal during the goals→arenas transition.
 */
export const ArenaChip: React.FC<ArenaChipProps> = ({ arenaId, size = 'sm' }) => {
  const arena = getArena(arenaId);
  if (!arena) return null;

  const iconSize = size === 'md' ? 15 : 12;
  const fontSize = size === 'md' ? FontSizes.sm : FontSizes.xs;

  return (
    <View style={[styles.chip, { backgroundColor: arena.color + '1A' }]}>
      <Ionicons name={arena.icon as any} size={iconSize} color={arena.color} />
      <Text style={[styles.text, { color: arena.color, fontSize }]} numberOfLines={1}>
        {arena.name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  text: {
    fontFamily: Fonts.secondaryBold,
  },
});

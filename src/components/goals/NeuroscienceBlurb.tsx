import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface NeuroscienceBlurbProps {
  title: string;
  content: string;
}

export const NeuroscienceBlurb: React.FC<NeuroscienceBlurbProps> = ({ title, content }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={16} color={Colors.primary} />
        <Text style={styles.title}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.primary}
        />
      </View>
      {expanded && <Text style={styles.content}>{content}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  content: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
});

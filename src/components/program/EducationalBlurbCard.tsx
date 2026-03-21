import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ProgramDay } from '../../types';

interface Props {
  programDay: ProgramDay;
  programColor: string;
  onViewed?: () => void;
}

export const EducationalBlurbCard: React.FC<Props> = ({
  programDay,
  programColor,
  onViewed,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    if (!expanded && onViewed) {
      onViewed();
    }
    setExpanded(!expanded);
  };

  return (
    <TouchableOpacity
      style={{ ...styles.card, borderLeftColor: programColor }}
      onPress={handleToggle}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={20} color={programColor} />
        <Text style={styles.title} numberOfLines={expanded ? undefined : 1}>
          {programDay.educational_title}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.gray}
        />
      </View>

      {expanded && (
        <View style={styles.body}>
          <Text style={styles.contentText}>{programDay.educational_content}</Text>

          {programDay.neuroscience_note && (
            <View style={{ ...styles.scienceBox, backgroundColor: programColor + '08' }}>
              <Text style={styles.scienceLabel}>The Science</Text>
              <Text style={styles.scienceText}>{programDay.neuroscience_note}</Text>
            </View>
          )}

          {programDay.tip && (
            <View style={styles.tipRow}>
              <Ionicons name="bulb" size={16} color={Colors.secondary} />
              <Text style={styles.tipText}>{programDay.tip}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
  },
  body: {
    marginTop: Spacing.md,
  },
  contentText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 22,
  },
  scienceBox: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  scienceLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  scienceText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.secondary + '08',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  tipText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    flex: 1,
    lineHeight: 20,
  },
});

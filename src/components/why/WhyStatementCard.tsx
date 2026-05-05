import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface WhyStatementCardProps {
  statement: string;
  onEdit?: () => void;
}

export const WhyStatementCard: React.FC<WhyStatementCardProps> = ({ statement, onEdit }) => (
  <View style={styles.card}>
    <View style={styles.headerRow}>
      <Text style={styles.label}>Your Why</Text>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pencil" size={18} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
    <Text style={styles.statement}>"{statement}"</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary + '08',
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statement: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    lineHeight: 28,
  },
});

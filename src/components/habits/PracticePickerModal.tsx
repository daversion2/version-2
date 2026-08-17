import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../common/Button';
import { HabitDayState } from '../../services/practices';
import { formatDayHeader } from '../../utils/date';

interface Props {
  visible: boolean;
  /** The day being filled in (YYYY-MM-DD). */
  date: string;
  practices: HabitDayState[];
  loading?: boolean;
  onSelect: (state: HabitDayState) => void;
  onCancel: () => void;
}

/**
 * "Which practice?" for a specific past day. Purely a picker — difficulty,
 * tracking fields and notes are captured afterwards by <PracticeCaptureFlow>,
 * the same surface today's reps go through.
 *
 * This replaced a modal that asked its own difficulty question and hid any
 * practice already logged that day. Hiding them made a second rep impossible
 * and explained nothing; already-logged practices are now listed with their
 * count, and picking one again is allowed.
 */
export const PracticePickerModal: React.FC<Props> = ({
  visible,
  date,
  practices,
  loading = false,
  onSelect,
  onCancel,
}) => {
  const renderItem = ({ item }: { item: HabitDayState }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.habit.name}
        </Text>
        {item.loggedCount > 0 && (
          <Text style={styles.rowMeta}>
            {item.loggedCount} already logged
          </Text>
        )}
      </View>
      {item.loggedCount > 0 && (
        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
      )}
      <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Log a practice</Text>
          <Text style={styles.subtitle}>For {formatDayHeader(date)}</Text>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : practices.length === 0 ? (
            <Text style={styles.emptyText}>You have no active practices.</Text>
          ) : (
            <FlatList
              data={practices}
              keyExtractor={(item) => item.habit.id}
              renderItem={renderItem}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}

          <Button title="Cancel" onPress={onCancel} variant="outline" style={styles.cancel} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  list: { marginBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  rowText: { flex: 1 },
  rowName: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  rowMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 1,
  },
  cancel: { marginTop: Spacing.xs },
  loader: { marginVertical: Spacing.xl },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

/**
 * One-time inline pointer to the Craving Crusher tab, shown on Home until the
 * user taps or dismisses it.
 *
 * Deliberately a strip and not a modal: a craving can't be scheduled, so the
 * feature has to be findable from day one — but a new user has nothing to apply
 * it to yet, so interrupting them to teach it would land on nothing. This just
 * says where the thing is and gets out of the way. It sits under the hero, on a
 * day-1 Home that is otherwise uncrowded (the "Also today" band self-hides when
 * empty), so it costs a line rather than a step.
 */
interface Props {
  onPress: () => void;
  onDismiss: () => void;
}

export const CravingPointer: React.FC<Props> = ({ onPress, onDismiss }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel="Open Craving Crusher"
  >
    <View style={styles.iconWrap}>
      <Ionicons name="flash" size={18} color={Colors.white} />
    </View>
    <View style={styles.body}>
      <Text style={styles.title}>When an urge hits</Text>
      <Text style={styles.sub}>
        Craving Crusher is up top. Start the timer and the urge passes on its own.
      </Text>
    </View>
    <TouchableOpacity
      onPress={onDismiss}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel="Dismiss"
    >
      <Ionicons name="close" size={18} color={Colors.gray} />
    </TouchableOpacity>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: { flex: 1 },
  title: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  sub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
    lineHeight: 16,
  },
});

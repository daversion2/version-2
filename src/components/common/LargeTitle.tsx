import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, TextStyles } from '../../constants/theme';

/**
 * The redesign's screen header, drawn inside the scroll view in place of the
 * navigation bar: an optional "‹ Back" link, an optional small eyebrow (Today's
 * date), the big title, and an optional ⓘ that reopens the screen intro.
 */
export const LargeTitle: React.FC<{
  title: string;
  eyebrow?: string;
  back?: { label: string; onPress: () => void };
  onInfo?: () => void;
}> = ({ title, eyebrow, back, onInfo }) => (
  <View>
    {back ? (
      <TouchableOpacity
        style={styles.back}
        onPress={back.onPress}
        accessibilityRole="button"
        accessibilityLabel={`Back to ${back.label}`}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        <Text style={styles.backText}>{back.label}</Text>
      </TouchableOpacity>
    ) : null}
    <View style={styles.row}>
      <View style={styles.text}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {onInfo ? (
        <TouchableOpacity
          style={styles.info}
          onPress={onInfo}
          accessibilityRole="button"
          accessibilityLabel="How this screen works"
        >
          <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, marginLeft: -6 },
  backText: { ...TextStyles.body, color: Colors.primary },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4 },
  text: { flex: 1, gap: 2 },
  eyebrow: { ...TextStyles.footnote, fontWeight: '600', letterSpacing: 0.3, color: Colors.gray },
  title: { ...TextStyles.largeTitle, color: Colors.dark },
  info: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { triggerTapHaptic } from '../../utils/haptics';

interface Props {
  name: string;
  /** One short line under the name, only when it adds something. */
  caption?: string | null;
  /** Caption in the attention colour — "behind this week". */
  captionAlert?: boolean;
  /** Section colour: the app tile and the done check. */
  accentColor: string;
  /** Set for a habit with a mini-app behind it: draws its icon tile in place of the circle. */
  appIcon?: string;
  /** Done today: a filled check, the name dimmed, no tap. */
  done?: boolean;
  /** Shown on a done row, e.g. "Med". */
  doneLabel?: string;
  /** A tap: the quick sheet, or the app / briefing this habit opens. */
  onPress?: () => void;
  /** Press and hold: the full check-in (day, notes, every field). */
  onLongPress?: () => void;
  /** The › on the right: the habit's page. */
  onDetails: () => void;
  first?: boolean;
}

/**
 * One row on Today. The row's gesture decides how you log — a tap is the quick
 * route, a press and hold opens the full check-in. The › on the right is the
 * one separate target: the habit's page. The ⓘ in Today's header explains it.
 *
 * Left of the name: an app's tile (a tap opens the app) or a circle (a tap
 * opens the quick sheet).
 */
export const TodayRow: React.FC<Props> = ({
  name,
  caption,
  captionAlert,
  accentColor,
  appIcon,
  done,
  doneLabel,
  onPress,
  onLongPress,
  onDetails,
  first,
}) => (
  <View style={[styles.row, !first && styles.divider]}>
    <Pressable
      onPress={done ? undefined : onPress}
      onLongPress={
        onLongPress
          ? () => {
              triggerTapHaptic().catch(() => {});
              onLongPress();
            }
          : undefined
      }
      delayLongPress={400}
      style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ checked: !!done }}
      accessibilityLabel={`${name}${caption ? `. ${caption}` : ''}${done ? '. Done today' : ''}`}
      accessibilityHint={done ? 'Press and hold to log with details.' : 'Tap to log. Press and hold to log with details.'}
      accessibilityActions={onLongPress ? [{ name: 'longpress', label: 'Log with details' }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'longpress') onLongPress?.();
      }}
    >
      <View style={styles.glyph}>
        {appIcon ? (
          <View style={[styles.tile, { backgroundColor: accentColor }, done && styles.tileDone]}>
            <Ionicons name={appIcon as any} size={17} color={Colors.white} />
          </View>
        ) : done ? (
          <View style={[styles.check, { backgroundColor: accentColor }]}>
            <Ionicons name="checkmark" size={14} color={Colors.white} />
          </View>
        ) : (
          <View style={styles.circle} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, done && styles.nameDone]} numberOfLines={2}>
          {name}
        </Text>
        {!!caption && !done && (
          <Text style={[styles.caption, captionAlert && styles.captionAlert]} numberOfLines={1}>
            {caption}
          </Text>
        )}
      </View>
      {done && !!doneLabel && <Text style={styles.doneLabel}>{doneLabel}</Text>}
    </Pressable>
    <TouchableOpacity
      onPress={onDetails}
      style={styles.details}
      accessibilityRole="button"
      accessibilityLabel={`${name}: its page`}
    >
      <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: Colors.white },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md - 4,
    paddingLeft: Spacing.md - 2,
    minHeight: 58,
  },
  details: { width: 44, alignItems: 'center', justifyContent: 'center' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  pressed: { backgroundColor: Colors.lightGray },
  glyph: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  tile: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileDone: { opacity: 0.55 },
  circle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingVertical: Spacing.sm + 2, gap: 1 },
  name: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  nameDone: { color: Colors.gray, fontFamily: Fonts.secondary },
  caption: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  captionAlert: { color: Colors.secondary, fontFamily: Fonts.secondaryBold },
  doneLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
});

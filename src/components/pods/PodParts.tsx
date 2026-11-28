import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppColors, BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Copy } from '../common/Copy';
import { useCopy } from '../../context/CopyContext';
import { POD_REACTIONS } from '../../services/podMath';
import type { PodSessionView } from '../../services/pods';

// =============================================================================
// Pieces shared by the Pod screen and Today's Pod card (docs/pods.md).
// =============================================================================

export const appColor = (app: string): string => AppColors[app as keyof typeof AppColors] ?? Colors.primary;

/** A member's initial in a circle. Filled once they've shown up today. */
export const PodAvatar: React.FC<{ initial: string; showedUp: boolean; size?: number }> = ({
  initial,
  showedUp,
  size = 36,
}) => (
  <View
    style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2 },
      showedUp ? styles.avatarDone : styles.avatarNotYet,
    ]}
  >
    <Text style={[styles.avatarText, { fontSize: size * 0.42 }, showedUp ? styles.avatarTextDone : null]}>{initial}</Text>
  </View>
);

/**
 * How hard it was, as three bars: one per level, filled up to the hardest
 * shared. Brand orange is the effort colour; nothing shared, nothing drawn.
 */
export const EffortBars: React.FC<{ level: 1 | 2 | 3 | null }> = ({ level }) =>
  level ? (
    <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[1, 2, 3].map((n) => (
        <View key={n} style={[styles.bar, { height: 4 + n * 3 }, n <= level ? styles.barOn : styles.barOff]} />
      ))}
    </View>
  ) : null;

/** One shared session: app dot and name, the friction words, reactions on it. */
export const PodSessionLine: React.FC<{ session: PodSessionView; onPress?: () => void }> = ({ session, onPress }) => {
  const reactions = session.reactions.map((r) => (r.count > 1 ? `${r.label} ×${r.count}` : r.label)).join(' · ');
  const label = [session.appLabel, session.friction, reactions ? `Reactions: ${reactions}` : null].filter(Boolean).join('. ');
  const body = (
    <View style={styles.session}>
      <View style={[styles.appDot, { backgroundColor: appColor(session.app) }]} />
      <View style={styles.sessionText}>
        <View style={styles.sessionTop}>
          <Text style={styles.sessionApp}>{session.appLabel}</Text>
          <EffortBars level={session.level} />
        </View>
        {session.friction ? <Text style={styles.sessionFriction}>{session.friction}</Text> : null}
        {reactions ? <Text style={styles.sessionReactions}>{reactions}</Text> : null}
      </View>
      {session.canReact ? <Copy id="pods.parts.react" style={styles.reactHint}>React</Copy> : null}
    </View>
  );
  return onPress && session.canReact ? (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}. Double tap to react.`}>
      {body}
    </TouchableOpacity>
  ) : (
    <View accessible accessibilityLabel={label}>
      {body}
    </View>
  );
};

/** Pick a reaction for someone's session. Presets only: no free text, nothing to moderate. */
export const ReactionSheet: React.FC<{
  target: { name: string; appLabel: string } | null;
  sending: boolean;
  onPick: (preset: string) => void;
  onClose: () => void;
}> = ({ target, sending, onPick, onClose }) => {
  const t = useCopy();
  return (
    <BottomSheet
      visible={!!target}
      onClose={onClose}
      dismissable={!sending}
      title={target ? t('pods.parts.reactTitle', '{name}’s {app}', { name: target.name, app: target.appLabel }) : undefined}
    >
      <View style={styles.reactions}>
        {Object.entries(POD_REACTIONS).map(([preset, label]) => (
          <TouchableOpacity
            key={preset}
            style={[styles.reactionButton, sending && styles.disabled]}
            disabled={sending}
            onPress={() => onPick(preset)}
            accessibilityRole="button"
          >
            <Copy id={`pods.reaction.${preset}`} style={styles.reactionText}>{label}</Copy>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarDone: { backgroundColor: Colors.primary },
  avatarNotYet: { backgroundColor: Colors.fill },
  avatarText: { ...TextStyles.headline, color: Colors.gray },
  avatarTextDone: { color: Colors.white },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 1 },
  barOn: { backgroundColor: Colors.secondary },
  barOff: { backgroundColor: Colors.fill },
  session: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: 6 },
  appDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  sessionText: { flex: 1, gap: 2 },
  sessionTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sessionApp: { ...TextStyles.subhead, fontWeight: '600', color: Colors.dark },
  sessionFriction: { ...TextStyles.footnote, color: Colors.label2 },
  sessionReactions: { ...TextStyles.footnote, color: Colors.primary },
  reactHint: { ...TextStyles.footnote, fontWeight: '600', color: Colors.primary, paddingTop: 2 },
  reactions: { gap: Spacing.sm },
  reactionButton: {
    minHeight: 50,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  reactionText: { ...TextStyles.headline, color: Colors.dark },
  disabled: { opacity: 0.5 },
});

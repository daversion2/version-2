import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Fonts, Spacing } from '../../../../../constants/theme';
import { howToFor } from './exerciseHowTo';
import { WORKOUTS_ACCENT, ws } from './workoutsStyle';

/**
 * Just the photos, side by side with their Start/End labels — or nothing,
 * when the exercise has none. For places where the photos sit inside
 * something else, like an exercise's card in the block editor.
 */
export const ExercisePhotos: React.FC<{ exerciseId: string; style?: StyleProp<ViewStyle> }> = ({ exerciseId, style }) => {
  const howTo = howToFor(exerciseId);
  if (!howTo || !howTo.frames.every((f) => f.image)) return null;
  const { frames, stock } = howTo;
  return (
    <View style={[styles.photos, style]}>
      {frames.map((f) => (
        <View
          key={f.label}
          style={[styles.photoWrap, stock && styles.stockWrap, frames.length === 1 && styles.single]}
        >
          <Image
            source={f.image!}
            style={styles.photo}
            // Stock photos come in mixed shapes: show all of it, never crop a limb off.
            resizeMode={stock ? 'contain' : 'cover'}
            accessibilityLabel={`${f.label} position: ${f.text}`}
          />
          <View style={styles.tag}>
            <Text style={styles.tagText}>{f.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

/**
 * How an exercise is done: the start and end photos side by side, with the
 * labels drawn here rather than in the photos, then the form cues (core
 * exercises) or numbered steps (library exercises). A core exercise without
 * approved photos shows its positions as text; an exercise the user made has
 * none of this, and gets nothing.
 */
export const ExerciseDemoCard: React.FC<{ exerciseId: string }> = ({ exerciseId }) => {
  const howTo = howToFor(exerciseId);
  if (!howTo) return null;
  const { frames, cues, steps } = howTo;
  const hasPhotos = frames.every((f) => f.image);

  return (
    <View style={[ws.card, styles.card]}>
      {hasPhotos ? (
        <ExercisePhotos exerciseId={exerciseId} />
      ) : (
        frames.map((f) => (
          <View key={f.label} style={styles.textRow}>
            <Text style={styles.textLabel}>{f.label}</Text>
            <Text style={ws.body}>{f.text}</Text>
          </View>
        ))
      )}
      {cues.length > 0 && (
        <View style={styles.cues}>
          {cues.map((c) => (
            <View key={c} style={styles.cueRow}>
              <View style={styles.dot} />
              <Text style={ws.body}>{c}</Text>
            </View>
          ))}
        </View>
      )}
      {steps.length > 0 && (
        <View style={styles.cues}>
          <Text style={styles.textLabel}>How to do it</Text>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={[ws.body, styles.stepText]}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  photos: { flexDirection: 'row', gap: Spacing.sm },
  photoWrap: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.lightGray,
  },
  stockWrap: { aspectRatio: 3 / 2 },
  single: { flex: 0, width: '100%' },
  photo: { width: '100%', height: '100%' },
  tag: {
    position: 'absolute',
    left: Spacing.sm,
    top: Spacing.sm,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  tagText: { fontFamily: Fonts.secondaryBold, fontSize: 11, letterSpacing: 0.4, color: Colors.white },
  textRow: { gap: 2 },
  textLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: WORKOUTS_ACCENT,
  },
  cues: { gap: Spacing.xs },
  cueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: WORKOUTS_ACCENT },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  stepNum: { fontFamily: Fonts.secondaryBold, fontSize: 13, lineHeight: 20, color: WORKOUTS_ACCENT, minWidth: 14 },
  stepText: { flex: 1 },
});

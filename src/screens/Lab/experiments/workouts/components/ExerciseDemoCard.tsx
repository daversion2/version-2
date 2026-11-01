import React from 'react';
import { Image, ImageSourcePropType, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Fonts, Spacing } from '../../../../../constants/theme';
import { EXERCISE_DEMOS } from '../../../../../data/exerciseDemos';
import { EXERCISE_DEMO_IMAGES } from '../../../../../data/exerciseDemoImages';
import { WORKOUTS_ACCENT, ws } from './workoutsStyle';

type Frame = { label: string; text: string; image?: ImageSourcePropType };

const framesOf = (exerciseId: string): Frame[] | null => {
  const demo = EXERCISE_DEMOS[exerciseId];
  if (!demo) return null;
  const images = EXERCISE_DEMO_IMAGES[exerciseId];
  return demo.end
    ? [
        { label: 'Start', text: demo.start, image: images?.start },
        { label: 'End', text: demo.end, image: images?.end },
      ]
    : [{ label: 'Position', text: demo.start, image: images?.start }];
};

/**
 * Just the approved photos, side by side with their Start/End labels — or
 * nothing, when the exercise has none. For places where the photos sit inside
 * something else, like an exercise's card in the block editor.
 */
export const ExercisePhotos: React.FC<{ exerciseId: string; style?: StyleProp<ViewStyle> }> = ({ exerciseId, style }) => {
  const frames = framesOf(exerciseId);
  if (!frames || !frames.every((f) => f.image)) return null;
  return (
    <View style={[styles.photos, style]}>
      {frames.map((f) => (
        <View key={f.label} style={[styles.photoWrap, frames.length === 1 && styles.single]}>
          <Image
            source={f.image!}
            style={styles.photo}
            resizeMode="cover"
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
 * How an exercise is done: the approved start and end photos side by side,
 * with the labels and form cues drawn here rather than in the photos. Without
 * approved photos it shows the same positions as text; an exercise the user
 * made has neither, and gets nothing.
 */
export const ExerciseDemoCard: React.FC<{ exerciseId: string }> = ({ exerciseId }) => {
  const frames = framesOf(exerciseId);
  if (!frames) return null;
  const cues = EXERCISE_DEMOS[exerciseId].cues;
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
      {!!cues?.length && (
        <View style={styles.cues}>
          {cues.map((c) => (
            <View key={c} style={styles.cueRow}>
              <View style={styles.dot} />
              <Text style={ws.body}>{c}</Text>
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
});

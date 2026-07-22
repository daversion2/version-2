import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { LESSON_SETS } from '../../data/cravings';

interface Props {
  /** Rotates which lesson set shows so repeat riders see new material. */
  setIndex: number;
}

/**
 * Three micro-lessons ending in a one-tap quiz — retrieval beats re-reading
 * for retention, so the session closes with a question, not a summary.
 */
export const LearnActivity: React.FC<Props> = ({ setIndex }) => {
  const set = LESSON_SETS[setIndex % LESSON_SETS.length];
  // Steps 0..2 are lessons; step 3 is the quiz.
  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);

  const onQuiz = step >= set.lessons.length;
  const lesson = onQuiz ? null : set.lessons[step];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.progressRow}>
        {[...set.lessons, set.quiz].map((_, i) => (
          <View key={i} style={[styles.progressDot, i <= step && styles.progressDotDone]} />
        ))}
      </View>

      {lesson && (
        <View style={styles.card}>
          <Text style={styles.kicker}>
            LESSON {step + 1} OF {set.lessons.length} · {lesson.kicker.toUpperCase()}
          </Text>
          <Text style={styles.title}>{lesson.title}</Text>
          <Text style={styles.text}>{lesson.text}</Text>
          <TouchableOpacity onPress={() => setStep(step + 1)}>
            <Text style={styles.next}>
              {step + 1 < set.lessons.length ? 'Next lesson →' : 'Quick check →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {onQuiz && (
        <View style={styles.quizCard}>
          <Text style={styles.quizQ}>{set.quiz.question}</Text>
          {set.quiz.options.map((opt, i) => {
            const picked = answered === i;
            const showCorrect = answered !== null && i === set.quiz.correctIndex;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.quizOpt,
                  showCorrect && styles.quizOptCorrect,
                  picked && !showCorrect && styles.quizOptWrong,
                ]}
                onPress={() => answered === null && setAnswered(i)}
                disabled={answered !== null}
              >
                <Text
                  style={[
                    styles.quizOptText,
                    (showCorrect || picked) && styles.quizOptTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
          {answered !== null && <Text style={styles.reveal}>{set.quiz.reveal}</Text>}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.sm },
  progressRow: { flexDirection: 'row', gap: 5, marginBottom: Spacing.md },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressDotDone: { backgroundColor: Colors.primary },
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  kicker: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: '#7AB8C0',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  text: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 23,
  },
  next: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: '#7AB8C0',
    marginTop: Spacing.md,
  },
  quizCard: {
    backgroundColor: 'rgba(33,113,128,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(33,113,128,0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  quizQ: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  quizOpt: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.sm + 2,
    padding: Spacing.sm + 3,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  quizOptCorrect: { borderColor: Colors.primary, backgroundColor: 'rgba(33,113,128,0.3)' },
  quizOptWrong: { borderColor: Colors.secondary },
  quizOptText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  quizOptTextActive: { color: Colors.white, fontFamily: Fonts.secondaryBold },
  reveal: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: '#7AB8C0',
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
});

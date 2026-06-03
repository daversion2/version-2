import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { MicroExerciseDefinition, MicroExerciseSessionState } from '../../types/microExercise';
import { HomeScreenProps } from '../../types/navigation';

type Props = HomeScreenProps<'MicroExerciseQuestion'>;

export const MicroExerciseQuestionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { session, question_index, exercise } = route.params;

  const question = exercise.questions[question_index];
  const [answer, setAnswer] = useState(session.responses[question.id] ?? '');
  const isLast = question_index === exercise.questions.length - 1;

  const handleContinue = () => {
    const updatedSession: MicroExerciseSessionState = {
      ...session,
      responses: { ...session.responses, [question.id]: answer.trim() },
    };

    if (isLast) {
      navigation.navigate('MicroExerciseCommitment', { session: updatedSession, exercise });
    } else {
      navigation.replace('MicroExerciseQuestion', {
        session: updatedSession,
        question_index: question_index + 1,
        exercise,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.popToTop()} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={Colors.gray} />
          </TouchableOpacity>
        </View>

        {/* Progress dots */}
        <View style={styles.progressRow}>
          {exercise.questions.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i <= question_index && styles.dotActive]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.feelingTag}>{session.feeling_label}</Text>
          <Text style={styles.question}>{question.prompt}</Text>

          <TextInput
            style={styles.input}
            value={answer}
            onChangeText={setAnswer}
            placeholder={question.placeholder}
            placeholderTextColor={Colors.gray}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
            autoFocus
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueButton, !answer.trim() && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!answer.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {isLast ? 'One last step' : 'Continue'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  feelingTag: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  question: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    lineHeight: 30,
    marginBottom: Spacing.xl,
  },
  input: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 140,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});

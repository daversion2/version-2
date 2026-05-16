import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { MicroExerciseDefinition, MicroExerciseSessionState } from '../../types/microExercise';
import { WORKSHEET_TEMPLATES } from '../../data/worksheetTemplates';

type Props = NativeStackScreenProps<any, 'MicroExerciseComplete'>;

export const MicroExerciseCompleteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { session, exercise, pointsAwarded } = route.params as {
    session: MicroExerciseSessionState;
    exercise: MicroExerciseDefinition;
    pointsAwarded: number;
  };

  const sourceTemplate = WORKSHEET_TEMPLATES.find(
    (t) => t.id === exercise.source_template_id
  );

  const handleGoDeeper = () => {
    // Navigate to the Worksheets tab's WorksheetForm screen
    navigation.getParent()?.navigate('Worksheets', {
      screen: 'WorksheetForm',
      params: { templateId: exercise.source_template_id },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={72} color={Colors.primary} />
        </View>

        <Text style={styles.affirmation}>{exercise.completion_affirmation}</Text>

        {session.micro_commitment ? (
          <View style={styles.commitmentCard}>
            <Text style={styles.commitmentLabel}>Your commitment</Text>
            <Text style={styles.commitmentText}>"{session.micro_commitment}"</Text>
          </View>
        ) : null}

        {pointsAwarded > 0 && (
          <View style={styles.pointsBadge}>
            <Ionicons name="flash" size={14} color={Colors.secondary} />
            <Text style={styles.pointsText}>+{pointsAwarded} willpower points</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.popToTop()}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>

        {sourceTemplate && (
          <TouchableOpacity onPress={handleGoDeeper} style={styles.deeperLink} activeOpacity={0.7}>
            <Text style={styles.deeperLinkText}>
              Want to go deeper? Try the full{' '}
              <Text style={styles.deeperLinkBold}>{sourceTemplate.name}</Text> worksheet
            </Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  affirmation: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  commitmentCard: {
    width: '100%',
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commitmentLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  commitmentText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.secondary + '15',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  pointsText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  doneButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  doneButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  deeperLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  deeperLinkText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    lineHeight: 20,
    textAlign: 'center',
    flex: 1,
  },
  deeperLinkBold: {
    fontFamily: Fonts.secondaryBold,
  },
});

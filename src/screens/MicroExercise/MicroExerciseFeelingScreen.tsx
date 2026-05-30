import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { MicroExerciseDefinition, MicroExerciseSessionState } from '../../types/microExercise';
import { MICRO_EXERCISES, getOrderedFeelingsForTrigger } from '../../data/microExercises';
import { MicroExerciseTrigger } from '../../types/worksheets';
import { HomeScreenProps } from '../../types/navigation';

type Props = HomeScreenProps<'MicroExerciseFeeling'>;

export const MicroExerciseFeelingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { trigger_context } = route.params;
  const [showAll, setShowAll] = useState(false);

  const ordered = getOrderedFeelingsForTrigger(trigger_context);
  const visible = showAll ? ordered : ordered.slice(0, 3);
  const hasMore = ordered.length > 3;

  const handleSelect = (exercise: MicroExerciseDefinition) => {
    const session: MicroExerciseSessionState = {
      trigger_context,
      feeling_key: exercise.feeling_key,
      feeling_label: exercise.feeling_label,
      source_template_id: exercise.source_template_id,
      responses: {},
      micro_commitment: '',
    };
    navigation.navigate('MicroExerciseQuestion', {
      session,
      question_index: 0,
      exercise,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.popToTop()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={Colors.gray} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What resonates most right now?</Text>
        <Text style={styles.subtitle}>Pick whichever feels closest. There's no wrong answer.</Text>

        <View style={styles.feelingList}>
          {visible.map((exercise) => (
            <TouchableOpacity
              key={exercise.feeling_key}
              style={styles.feelingCard}
              onPress={() => handleSelect(exercise)}
              activeOpacity={0.7}
            >
              <Text style={styles.feelingLabel}>{exercise.feeling_label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          ))}
        </View>

        {hasMore && !showAll && (
          <TouchableOpacity onPress={() => setShowAll(true)} style={styles.seeMoreButton}>
            <Text style={styles.seeMoreText}>See more options</Text>
            <Ionicons name="chevron-down" size={14} color={Colors.primary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.popToTop()} style={styles.dismissButton}>
          <Text style={styles.dismissText}>Not right now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  feelingList: {
    gap: Spacing.sm,
  },
  feelingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  feelingLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    flex: 1,
    marginRight: Spacing.sm,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  seeMoreText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  dismissButton: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  dismissText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});

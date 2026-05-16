import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { getWorksheetEntryById, updateMicroExerciseFollowUp } from '../../services/worksheets';
import { useAuth } from '../../context/AuthContext';
import { MicroExerciseTrigger } from '../../types/worksheets';

type Props = NativeStackScreenProps<any, 'MicroExerciseFollowUp'>;

type ScreenState = 'loading' | 'prompt' | 'did_it' | 'not_yet' | 'error';

export const MicroExerciseFollowUpScreen: React.FC<Props> = ({ navigation, route }) => {
  const { entry_id, user_id } = route.params as { entry_id: string; user_id: string };
  const { user } = useAuth();

  const [state, setState] = useState<ScreenState>('loading');
  const [commitment, setCommitment] = useState('');
  const [saving, setSaving] = useState(false);

  const resolvedUserId = user?.uid ?? user_id;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const entry = await getWorksheetEntryById(resolvedUserId, entry_id);
        if (!mounted) return;
        if (entry?.micro_commitment) {
          setCommitment(entry.micro_commitment);
          setState('prompt');
        } else {
          setState('error');
        }
      } catch {
        if (mounted) setState('error');
      }
    })();
    return () => { mounted = false; };
  }, [resolvedUserId, entry_id]);

  const handleResponse = async (followedThrough: boolean) => {
    setSaving(true);
    try {
      await updateMicroExerciseFollowUp(resolvedUserId, entry_id, followedThrough);
    } catch {
      // Non-blocking — continue regardless
    } finally {
      setSaving(false);
      setState(followedThrough ? 'did_it' : 'not_yet');
    }
  };

  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (state === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Couldn't load your commitment</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('HomeScreen')}>
            <Text style={styles.primaryButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'did_it') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.primary} style={styles.icon} />
          <Text style={styles.title}>That's a genuine win.</Text>
          <Text style={styles.body}>
            Keeping small commitments builds real trust with yourself. That's how lasting change
            actually happens.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('HomeScreen')}
          >
            <Text style={styles.primaryButtonText}>Keep going</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'not_yet') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="heart-outline" size={64} color={Colors.secondary} style={styles.icon} />
          <Text style={styles.title}>That's okay.</Text>
          <Text style={styles.body}>
            Knowing what gets in the way is how you eventually break through. That's useful data,
            not failure.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              navigation.navigate('MicroExerciseFeeling', {
                trigger_context: 'comeback' as MicroExerciseTrigger,
              })
            }
          >
            <Text style={styles.primaryButtonText}>Try working through it again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('HomeScreen')}
          >
            <Text style={styles.secondaryButtonText}>I'll keep going from here</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Default: 'prompt' state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>How did yesterday go?</Text>

        <View style={styles.commitmentCard}>
          <Text style={styles.commitmentLabel}>You committed to</Text>
          <Text style={styles.commitmentText}>"{commitment}"</Text>
        </View>

        <Text style={styles.question}>Did it happen?</Text>

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
          onPress={() => handleResponse(true)}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" size={18} color={Colors.white} />
          <Text style={styles.primaryButtonText}>Yes, I did it</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, saving && styles.buttonDisabled]}
          onPress={() => handleResponse(false)}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Not quite — that's okay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loader: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.lg,
  },
  body: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  commitmentCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
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
  question: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  primaryButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  secondaryButtonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

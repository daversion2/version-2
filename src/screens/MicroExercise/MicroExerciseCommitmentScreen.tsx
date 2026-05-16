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
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { MicroExerciseDefinition, MicroExerciseSessionState } from '../../types/microExercise';
import { saveMicroExerciseEntry } from '../../services/worksheets';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<any, 'MicroExerciseCommitment'>;

export const MicroExerciseCommitmentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { session, exercise } = route.params as {
    session: MicroExerciseSessionState;
    exercise: MicroExerciseDefinition;
  };

  const { user } = useAuth();
  const [commitment, setCommitment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !commitment.trim()) return;
    setSaving(true);
    try {
      const result = await saveMicroExerciseEntry(user.uid, {
        feeling: session.feeling_key,
        trigger_context: session.trigger_context,
        responses: session.responses,
        micro_commitment: commitment.trim(),
      });

      const updatedSession: MicroExerciseSessionState = {
        ...session,
        micro_commitment: commitment.trim(),
        entry_id: result.id,
      };

      navigation.navigate('MicroExerciseComplete', {
        session: updatedSession,
        exercise,
        pointsAwarded: result.pointsAwarded,
      });
    } catch (e) {
      Alert.alert('Something went wrong', 'We couldn\'t save your exercise. Please try again.');
    } finally {
      setSaving(false);
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

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconRow}>
            <Ionicons name="flag-outline" size={28} color={Colors.secondary} />
          </View>
          <Text style={styles.title}>One thing. Just today.</Text>
          <Text style={styles.subtitle}>
            Based on what you just worked through — what's one small, specific thing you'll do
            differently today?
          </Text>

          <TextInput
            style={styles.input}
            value={commitment}
            onChangeText={setCommitment}
            placeholder="e.g. I'll start with just 5 minutes instead of waiting to feel ready..."
            placeholderTextColor={Colors.gray}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={300}
            autoFocus
          />

          <Text style={styles.helperText}>Tomorrow we'll check in on how it went.</Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, (!commitment.trim() || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!commitment.trim() || saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save & Commit'}
            </Text>
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
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  iconRow: {
    marginBottom: Spacing.md,
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
  input: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 120,
    lineHeight: 22,
  },
  helperText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  saveButton: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});

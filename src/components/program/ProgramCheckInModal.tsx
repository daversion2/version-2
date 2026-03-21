import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { InputField } from '../common/InputField';
import { Button } from '../common/Button';
import { ProgramDay } from '../../types';

interface Props {
  visible: boolean;
  dayNumber: number;
  programDay: ProgramDay;
  programColor: string;
  onConfirm: (succeeded: boolean, points: number, note?: string) => void;
  onClose: () => void;
}

export const ProgramCheckInModal: React.FC<Props> = ({
  visible,
  dayNumber,
  programDay,
  programColor,
  onConfirm,
  onClose,
}) => {
  const [succeeded, setSucceeded] = useState<boolean | null>(null);
  const [points, setPoints] = useState<number>(3);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEducational, setShowEducational] = useState(false);

  const handleConfirm = async () => {
    if (succeeded === null) return;
    setLoading(true);
    await onConfirm(succeeded, points, note.trim() || undefined);
    setLoading(false);
    setSucceeded(null);
    setPoints(3);
    setNote('');
    setShowEducational(false);
  };

  const handleClose = () => {
    setSucceeded(null);
    setPoints(3);
    setNote('');
    setShowEducational(false);
    onClose();
  };

  const pointLabels: Record<number, string> = {
    1: 'Minimal',
    2: 'Easy',
    3: 'Moderate',
    4: 'Hard',
    5: 'Intense',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Day {dayNumber} Check-in</Text>

            {/* Today's Challenge Reminder */}
            <View style={{ ...styles.challengeReminder, borderLeftColor: programColor }}>
              <Text style={styles.challengeLabel}>Today's Challenge</Text>
              <Text style={styles.challengeName}>{programDay.challenge_name}</Text>
            </View>

            {/* Educational Content Toggle */}
            <TouchableOpacity
              style={styles.educationalToggle}
              onPress={() => setShowEducational(!showEducational)}
              activeOpacity={0.7}
            >
              <Ionicons name="bulb-outline" size={18} color={programColor} />
              <Text style={{ ...styles.educationalToggleText, color: programColor }}>
                {programDay.educational_title}
              </Text>
              <Ionicons
                name={showEducational ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={programColor}
              />
            </TouchableOpacity>

            {showEducational && (
              <View style={{ ...styles.educationalContent, backgroundColor: programColor + '08' }}>
                <Text style={styles.educationalText}>{programDay.educational_content}</Text>
                {programDay.neuroscience_note && (
                  <Text style={styles.scienceNote}>{programDay.neuroscience_note}</Text>
                )}
                {programDay.tip && (
                  <View style={styles.tipRow}>
                    <Ionicons name="bulb" size={14} color={Colors.secondary} />
                    <Text style={styles.tipText}>{programDay.tip}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Success/Failure Toggle */}
            <Text style={styles.question}>Did you complete the challenge?</Text>

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  succeeded === true && { backgroundColor: Colors.success + '15', borderColor: Colors.success },
                ]}
                onPress={() => setSucceeded(true)}
              >
                <Text style={[styles.optionIcon, succeeded === true && { color: Colors.success }]}>
                  {'\u2713'}
                </Text>
                <Text style={styles.optionText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  succeeded === false && { backgroundColor: Colors.fail + '15', borderColor: Colors.fail },
                ]}
                onPress={() => setSucceeded(false)}
              >
                <Text style={[styles.optionIcon, succeeded === false && { color: Colors.fail }]}>
                  {'\u2717'}
                </Text>
                <Text style={styles.optionText}>No</Text>
              </TouchableOpacity>
            </View>

            {/* Effort Rating (only if succeeded) */}
            {succeeded === true && (
              <>
                <Text style={styles.pointsLabel}>How much effort did it require?</Text>
                <View style={styles.pointsRow}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.pointButton,
                        points === value && { backgroundColor: programColor, borderColor: programColor },
                      ]}
                      onPress={() => setPoints(value)}
                    >
                      <Text style={[styles.pointValue, points === value && styles.pointValueSelected]}>
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.pointDescription}>
                  {pointLabels[points]} — {points} {points === 1 ? 'point' : 'points'}
                </Text>
              </>
            )}

            {succeeded === false && (
              <Text style={styles.graceNote}>
                This will use a grace day. You won't earn points, but your program continues.
              </Text>
            )}

            <InputField
              label="Quick note (optional)"
              value={note}
              onChangeText={setNote}
              placeholder="How did today go?"
              multiline
              numberOfLines={3}
            />

            <Button
              title="Confirm Check-in"
              onPress={handleConfirm}
              disabled={succeeded === null}
              loading={loading}
              style={styles.confirmButton}
            />

            <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  content: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  challengeReminder: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.md,
    marginBottom: Spacing.md,
  },
  challengeLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  challengeName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: 2,
  },
  educationalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  educationalToggleText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    flex: 1,
  },
  educationalContent: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  educationalText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  scienceNote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tipText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    flex: 1,
    lineHeight: 18,
  },
  question: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  optionButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 24,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  optionText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  pointsLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  pointButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  pointValueSelected: {
    color: Colors.white,
  },
  pointDescription: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  graceNote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  confirmButton: {
    marginTop: Spacing.md,
  },
  cancelButton: {
    marginTop: Spacing.md,
    alignSelf: 'center',
    padding: Spacing.sm,
  },
  cancelText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
});

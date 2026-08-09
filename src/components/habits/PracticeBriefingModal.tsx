import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { getPractice } from '../../data/practices';
import { getMindPattern, MindPattern } from '../../services/mindPatterns';
import { PracticeReady } from './PracticeReady';

interface Props {
  visible: boolean;
  /** Catalog id. Nothing renders if the practice has no briefing content. */
  practiceId?: string;
  /** Practice instance id — used to look up the recent-reps mind pattern. */
  habitId?: string;
  userId?: string;
  /** Commit and run the forward flow from here. */
  onStart: () => void;
  /** Open the full learn content (how-to / science / tips). */
  onLearn: () => void;
  onClose: () => void;
}

/**
 * The pre-practice briefing on its own, opened from the practice card.
 *
 * The same <PracticeReady> beat the forward flow opens with — but reachable
 * without committing to that flow. The briefing is content, not a gate: making
 * it the only route to logging is what forced people through a "start" they'd
 * already finished.
 */
export const PracticeBriefingModal: React.FC<Props> = ({
  visible,
  practiceId,
  habitId,
  userId,
  onStart,
  onLearn,
  onClose,
}) => {
  const practice = getPractice(practiceId);
  const [mindPattern, setMindPattern] = useState<MindPattern | null>(null);

  useEffect(() => {
    if (!visible || !userId || !habitId) return;
    let cancelled = false;
    getMindPattern(userId, habitId)
      .then((p) => {
        if (!cancelled) setMindPattern(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, userId, habitId]);

  if (!visible || !practice?.ready) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={Colors.gray} />
          </TouchableOpacity>
        </View>
        <PracticeReady
          practice={practice}
          mindPattern={mindPattern}
          onBegin={onStart}
          onLearn={onLearn}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { AvoidanceTask } from '../../types';
import {
  addAvoidanceTask,
  computeAvoidanceStreak,
  getAvoidanceTasks,
  markTaskCompleted,
  markTaskUncompleted,
} from '../../services/avoidanceTasks';
import { getTodayString } from '../../utils/date';

// ─── Interview questions ──────────────────────────────────────────────────────

const QUESTIONS = [
  {
    category: 'HOME & CHORES',
    text: "What's a home task you've been putting off for at least two weeks?",
    placeholder: 'e.g. Clean out the garage, fix the leaky faucet…',
  },
  {
    category: 'FINANCE & ADMIN',
    text: 'Is there a financial or admin task you keep avoiding?',
    placeholder: 'e.g. Pay taxes, call insurance, sort expense receipts…',
  },
  {
    category: 'PERSONAL',
    text: 'What personal task are you dreading?',
    placeholder: "e.g. Schedule a doctor's visit, have a hard conversation…",
  },
  {
    category: 'ANYTHING ELSE',
    text: 'One more — what else have you been putting off?',
    placeholder: 'e.g. Reply to that email, organize your car…',
  },
] as const;

// ─── Interview Modal ──────────────────────────────────────────────────────────

interface InterviewModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (items: Array<{ text: string; category: string }>) => Promise<void>;
}

const InterviewModal: React.FC<InterviewModalProps> = ({ visible, onClose, onComplete }) => {
  const [phase, setPhase] = useState<'intro' | 'flow' | 'done'>('intro');
  const [qIdx, setQIdx] = useState(0);
  const [input, setInput] = useState('');
  const [added, setAdded] = useState<Array<{ text: string; category: string }>>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const reset = () => {
    setPhase('intro');
    setQIdx(0);
    setInput('');
    setAdded([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const advance = (withText?: string) => {
    const newAdded =
      withText
        ? [...added, { text: withText, category: QUESTIONS[qIdx].category }]
        : added;
    setAdded(newAdded);
    setInput('');
    if (qIdx >= QUESTIONS.length - 1) {
      setPhase('done');
    } else {
      setQIdx(q => q + 1);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  };

  const handleAdd = () => {
    const val = input.trim();
    advance(val || undefined);
  };

  const handleFinish = async () => {
    if (added.length === 0) { handleClose(); return; }
    setSaving(true);
    try {
      await onComplete(added);
    } finally {
      setSaving(false);
      reset();
    }
  };

  const q = QUESTIONS[qIdx];
  const progress = ((qIdx + 1) / QUESTIONS.length) * 100;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={iv.root}
      >
        {/* ── Intro ── */}
        {phase === 'intro' && (
          <View style={iv.intro}>
            <View style={iv.introIconWrap}>
              <Ionicons name="flash" size={30} color={Colors.primary} />
            </View>
            <Text style={iv.introTitle}>Build Your Override Queue</Text>
            <Text style={iv.introBody}>
              Avoidance is how discomfort wins. Answer 4 quick questions to surface the tasks
              you keep putting off — then chip away at them one rep at a time.
            </Text>
            <TouchableOpacity
              style={iv.primaryBtn}
              onPress={() => {
                setPhase('flow');
                setTimeout(() => inputRef.current?.focus(), 200);
              }}
              activeOpacity={0.85}
            >
              <Text style={iv.primaryBtnText}>Build My Queue</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={iv.ghostBtn}>
              <Text style={iv.ghostBtnText}>Not now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Flow ── */}
        {phase === 'flow' && (
          <View style={iv.flow}>
            <View style={iv.flowHeader}>
              <TouchableOpacity onPress={handleClose} style={iv.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={Colors.dark} />
              </TouchableOpacity>
              <Text style={iv.flowTitle}>Building Queue</Text>
              <View style={{ width: 32 }} />
            </View>

            <View style={iv.progArea}>
              <View style={iv.progTrack}>
                <View style={[iv.progFill, { width: `${progress}%` as any }]} />
              </View>
              <Text style={iv.progLabel}>Question {qIdx + 1} of {QUESTIONS.length}</Text>
            </View>

            <View style={iv.qArea}>
              <Text style={iv.qCat}>{q.category}</Text>
              <Text style={iv.qText}>{q.text}</Text>
            </View>

            <View style={iv.inputArea}>
              <TextInput
                ref={inputRef}
                style={iv.textInput}
                value={input}
                onChangeText={setInput}
                placeholder={q.placeholder}
                placeholderTextColor={Colors.gray}
                multiline
                numberOfLines={2}
                blurOnSubmit
                returnKeyType="done"
              />
              <View style={iv.btnRow}>
                <TouchableOpacity style={iv.addBtn} onPress={handleAdd} activeOpacity={0.85}>
                  <Text style={iv.addBtnText}>Add to Queue</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={iv.skipBtn}
                  onPress={() => advance()}
                  activeOpacity={0.7}
                >
                  <Text style={iv.skipBtnText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </View>

            {added.length > 0 && (
              <View style={iv.addedArea}>
                <Text style={iv.addedLabel}>Added to queue</Text>
                {added.map((item, i) => (
                  <View key={i} style={iv.addedItem}>
                    <View style={iv.addedDot} />
                    <Text style={iv.addedText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Done ── */}
        {phase === 'done' && (
          <View style={iv.done}>
            <Text style={iv.doneEmoji}>🎯</Text>
            <Text style={iv.doneCount}>{added.length}</Text>
            <Text style={iv.doneCountLabel}>avoidance tasks queued</Text>
            <Text style={iv.doneTitle}>Queue is ready.</Text>
            <Text style={iv.doneBody}>
              Every task you complete is a rep at doing things your brain resists.
              That's the training.
            </Text>
            <TouchableOpacity
              style={[iv.primaryBtn, saving && { opacity: 0.7 }]}
              onPress={handleFinish}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={iv.primaryBtnText}>{saving ? 'Saving…' : 'Start training →'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── AvoidanceTab ─────────────────────────────────────────────────────────────

export const AvoidanceTab: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<AvoidanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInterview, setShowInterview] = useState(false);
  const today = getTodayString();

  const loadTasks = useCallback(async () => {
    if (!user) return;
    const t = await getAvoidanceTasks(user.uid);
    setTasks(t);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleToggle = async (task: AvoidanceTask) => {
    if (!user) return;
    const completed = task.completedDates.includes(today);
    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? {
              ...t,
              completedDates: completed
                ? t.completedDates.filter(d => d !== today)
                : [...t.completedDates, today],
            }
          : t
      )
    );
    if (completed) {
      await markTaskUncompleted(user.uid, task.id, today);
    } else {
      await markTaskCompleted(user.uid, task.id, today);
    }
  };

  const handleInterviewComplete = async (items: Array<{ text: string; category: string }>) => {
    if (!user) return;
    await Promise.all(items.map(i => addAvoidanceTask(user.uid, i.text, i.category)));
    setShowInterview(false);
    await loadTasks();
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const incomplete = tasks.filter(t => !t.completedDates.includes(today));
  const completedToday = tasks.filter(t => t.completedDates.includes(today));
  const streak = computeAvoidanceStreak(tasks, today);

  return (
    <>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {tasks.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="flash" size={26} color={Colors.primary} />
            </View>
            <Text style={s.emptyTitle}>Build Your Override Queue</Text>
            <Text style={s.emptyBody}>
              Avoidance is how discomfort wins. Answer 4 questions to surface the tasks you
              keep putting off — then chip away at them one rep at a time.
            </Text>
            <TouchableOpacity
              style={s.buildBtn}
              onPress={() => setShowInterview(true)}
              activeOpacity={0.85}
            >
              <Text style={s.buildBtnText}>Build My Queue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats */}
            <View style={s.statsRow}>
              <View style={s.statPill}>
                <Text style={[s.statNum, { color: Colors.secondary }]}>
                  {incomplete.length}
                </Text>
                <Text style={s.statLabel}>Remaining</Text>
              </View>
              <View style={s.statPill}>
                <Text style={[s.statNum, { color: Colors.primary }]}>
                  {completedToday.length}
                </Text>
                <Text style={s.statLabel}>Reps today</Text>
              </View>
              <View style={s.statPill}>
                <Text style={s.statNum}>{streak > 0 ? `🔥 ${streak}` : '—'}</Text>
                <Text style={s.statLabel}>Day streak</Text>
              </View>
            </View>

            {/* Incomplete tasks */}
            {incomplete.length > 0 && (
              <Text style={s.sectionLabel}>Up next</Text>
            )}
            {incomplete.map(task => (
              <TouchableOpacity
                key={task.id}
                style={s.taskCard}
                onPress={() => handleToggle(task)}
                activeOpacity={0.7}
              >
                <View style={s.checkbox} />
                <View style={s.taskBody}>
                  <Text style={s.taskText}>{task.text}</Text>
                  <Text style={s.taskCategory}>{task.category}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Completed today */}
            {completedToday.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: Spacing.md }]}>
                  Completed today
                </Text>
                {completedToday.map(task => (
                  <TouchableOpacity
                    key={task.id}
                    style={[s.taskCard, s.taskCardDone]}
                    onPress={() => handleToggle(task)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.checkbox, s.checkboxDone]}>
                      <Ionicons name="checkmark" size={13} color={Colors.white} />
                    </View>
                    <View style={s.taskBody}>
                      <Text style={[s.taskText, s.taskTextDone]}>{task.text}</Text>
                      <Text style={s.taskCategory}>{task.category}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Add more */}
            <TouchableOpacity
              style={s.addRow}
              onPress={() => setShowInterview(true)}
              activeOpacity={0.7}
            >
              <View style={s.addIcon}>
                <Ionicons name="add" size={16} color={Colors.primary} />
              </View>
              <Text style={s.addLabel}>Add to queue</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <InterviewModal
        visible={showInterview}
        onClose={() => setShowInterview(false)}
        onComplete={handleInterviewComplete}
      />
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(33,113,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  buildBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignSelf: 'stretch',
  },
  buildBtnText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
    textAlign: 'center',
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statPill: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 3,
  },

  // Section label
  sectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },

  // Task cards
  taskCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  taskCardDone: { opacity: 0.55 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBody: { flex: 1 },
  taskText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: Colors.gray,
  },
  taskCategory: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },

  // Add more row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  addIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(33,113,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
});

// ─── Interview Modal Styles ───────────────────────────────────────────────────

const iv = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },

  // Intro
  intro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  introIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(33,113,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(33,113,128,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  introTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.3,
  },
  introBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignSelf: 'stretch',
    marginBottom: Spacing.sm,
  },
  primaryBtnText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
    textAlign: 'center',
  },
  ghostBtn: { paddingVertical: Spacing.sm, alignSelf: 'stretch' },
  ghostBtnText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
  },

  // Flow
  flow: { flex: 1 },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowTitle: {
    flex: 1,
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    textAlign: 'center',
  },
  progArea: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  progTrack: {
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 999 },
  progLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  qArea: { padding: Spacing.lg, paddingBottom: Spacing.md },
  qCat: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  qText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  inputArea: { paddingHorizontal: Spacing.lg },
  textInput: {
    backgroundColor: Colors.lightGray,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  btnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  addBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addBtnText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  skipBtn: {
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  skipBtnText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  addedArea: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: Spacing.md,
  },
  addedLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  addedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  addedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
    flexShrink: 0,
  },
  addedText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
  },

  // Done
  done: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  doneEmoji: { fontSize: 50, marginBottom: Spacing.md },
  doneCount: {
    fontFamily: Fonts.primaryBold,
    fontSize: 48,
    color: Colors.primary,
    lineHeight: 52,
  },
  doneCountLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.lg,
  },
  doneTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    letterSpacing: -0.3,
    marginBottom: Spacing.sm,
  },
  doneBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
});

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
  completeTask,
  computeAvoidanceStreak,
  deleteAvoidanceTask,
  getAvoidanceTasks,
  uncompleteTask,
} from '../../services/avoidanceTasks';
import { getTodayString } from '../../utils/date';
import { showConfirm } from '../../utils/alert';
import { FeatureInfoModal } from '../../components/common/FeatureInfoModal';

// Optional category presets for quick-add. Tapping is entirely optional.
const CATEGORY_PRESETS = ['Home', 'Finance', 'Personal', 'Health', 'Work', 'Other'];

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

function formatConqueredDate(dateStr?: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ─── Quick Add ────────────────────────────────────────────────────────────────

interface QuickAddProps {
  onAdd: (text: string, category?: string) => void;
}

const QuickAdd: React.FC<QuickAddProps> = ({ onAdd }) => {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(t, category ?? undefined);
    setText('');
    setCategory(null);
    setCatOpen(false);
  };

  return (
    <View style={s.quickAdd}>
      <View style={s.quickAddRow}>
        <TextInput
          style={s.quickAddInput}
          value={text}
          onChangeText={setText}
          placeholder="Add something you've been putting off…"
          placeholderTextColor={Colors.gray}
          returnKeyType="done"
          onSubmitEditing={submit}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.quickAddBtn, !text.trim() && s.quickAddBtnDisabled]}
          onPress={submit}
          disabled={!text.trim()}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={s.catToggle}
        onPress={() => setCatOpen(o => !o)}
        activeOpacity={0.7}
      >
        <Ionicons name="pricetag-outline" size={13} color={Colors.gray} />
        <Text style={s.catToggleText}>{category ?? 'Add category (optional)'}</Text>
        <Ionicons
          name={catOpen ? 'chevron-up' : 'chevron-down'}
          size={13}
          color={Colors.gray}
        />
      </TouchableOpacity>

      {catOpen && (
        <View style={s.catChips}>
          {CATEGORY_PRESETS.map(c => {
            const sel = category === c;
            return (
              <TouchableOpacity
                key={c}
                style={[s.catChip, sel && s.catChipSel]}
                onPress={() => setCategory(sel ? null : c)}
                activeOpacity={0.7}
              >
                <Text style={[s.catChipText, sel && s.catChipTextSel]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ─── AvoidanceTab ─────────────────────────────────────────────────────────────

export const AvoidanceTab: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<AvoidanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInterview, setShowInterview] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const today = getTodayString();

  const loadTasks = useCallback(async () => {
    if (!user) return;
    const t = await getAvoidanceTasks(user.uid);
    setTasks(t);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleAdd = async (text: string, category?: string) => {
    if (!user) return;
    await addAvoidanceTask(user.uid, text, category);
    await loadTasks();
  };

  const handleComplete = async (task: AvoidanceTask) => {
    if (!user) return;
    const iso = new Date().toISOString();
    // Optimistic — conquer for good.
    setTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? { ...t, status: 'done', completedDate: today, completedAt: iso }
          : t
      )
    );
    await completeTask(user.uid, task.id, today, iso);
  };

  const handleUncomplete = async (task: AvoidanceTask) => {
    if (!user) return;
    // Optimistic — send it back to the active queue.
    setTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? { ...t, status: 'active', completedDate: undefined, completedAt: undefined }
          : t
      )
    );
    await uncompleteTask(user.uid, task.id);
  };

  const handleRemove = (task: AvoidanceTask) => {
    if (!user) return;
    showConfirm(
      'Remove task?',
      `"${task.text}" will be deleted. This won't count as conquered.`,
      async () => {
        setTasks(prev => prev.filter(t => t.id !== task.id));
        await deleteAvoidanceTask(user.uid, task.id);
      },
      'Remove',
    );
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

  const active = tasks.filter(t => t.status === 'active');
  const conquered = tasks
    .filter(t => t.status === 'done')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const streak = computeAvoidanceStreak(tasks, today);
  const isEmpty = tasks.length === 0;

  return (
    <>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.infoRow}>
          <TouchableOpacity
            onPress={() => setShowInfo(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={22} color={Colors.gray} />
          </TouchableOpacity>
        </View>

        {isEmpty ? (
          <View style={s.introCard}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="flash" size={26} color={Colors.primary} />
            </View>
            <Text style={s.emptyTitle}>Clear What You've Been Avoiding</Text>
            <Text style={s.emptyBody}>
              Avoidance is how discomfort wins. Drop in the things you keep putting off, then
              knock them out one at a time. Every task you finish is a permanent win.
            </Text>
          </View>
        ) : (
          <View style={s.statsRow}>
            <View style={s.statPill}>
              <Text style={s.statNum}>{streak > 0 ? `🔥 ${streak}` : '—'}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Day streak</Text>
            </View>
            <View style={s.statPill}>
              <Text style={[s.statNum, { color: Colors.primary }]}>{conquered.length}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Conquered</Text>
            </View>
            <View style={s.statPill}>
              <Text style={[s.statNum, { color: Colors.secondary }]}>{active.length}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Remaining</Text>
            </View>
          </View>
        )}

        <QuickAdd onAdd={handleAdd} />

        {active.length > 0 && <Text style={s.sectionLabel}>Up next</Text>}
        {active.map(task => (
          <View key={task.id} style={s.taskCard}>
            <TouchableOpacity
              onPress={() => handleComplete(task)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
              activeOpacity={0.6}
            >
              <View style={s.checkbox} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.taskBody}
              onPress={() => handleComplete(task)}
              activeOpacity={0.7}
            >
              <Text style={s.taskText}>{task.text}</Text>
              {!!task.category && <Text style={s.taskCategory}>{task.category}</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleRemove(task)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.6}
              style={s.removeBtn}
            >
              <Ionicons name="close" size={18} color={Colors.gray} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Guide me — the interview, now a secondary path */}
        <TouchableOpacity
          style={s.guideRow}
          onPress={() => setShowInterview(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles-outline" size={15} color={Colors.primary} />
          <Text style={s.guideText}>Not sure what to add? Answer a few questions</Text>
        </TouchableOpacity>

        {/* Conquered log */}
        {conquered.length > 0 && (
          <View style={s.logSection}>
            <TouchableOpacity
              style={s.logHeader}
              onPress={() => setLogOpen(o => !o)}
              activeOpacity={0.7}
            >
              <Text style={s.logHeaderText}>Conquered ({conquered.length})</Text>
              <Ionicons
                name={logOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.gray}
              />
            </TouchableOpacity>
            {logOpen &&
              conquered.map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={[s.taskCard, s.taskCardDone]}
                  onPress={() => handleUncomplete(task)}
                  activeOpacity={0.7}
                >
                  <View style={[s.checkbox, s.checkboxDone]}>
                    <Ionicons name="checkmark" size={13} color={Colors.white} />
                  </View>
                  <View style={s.taskBody}>
                    <Text style={[s.taskText, s.taskTextDone]}>{task.text}</Text>
                    <Text style={s.taskCategory}>
                      {formatConqueredDate(task.completedDate)}
                      {task.category ? ` · ${task.category}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </ScrollView>

      <InterviewModal
        visible={showInterview}
        onClose={() => setShowInterview(false)}
        onComplete={handleInterviewComplete}
      />

      <FeatureInfoModal
        visible={showInfo}
        onDismiss={() => setShowInfo(false)}
        icon="barbell"
        accent={Colors.primary}
        title="Avoidance Training"
        intro="The things you keep putting off aren’t a to-do problem. Every time you dodge one, the relief teaches your brain that dodging works — and the task gets heavier the longer it sits."
        points={[
          {
            label: 'Name what you’re avoiding.',
            text: 'Put everything you keep sliding past into one list. If nothing comes to mind, answer a few questions and it’ll surface fast — avoidance is good at hiding.',
          },
          {
            label: 'Start the one you want to skip.',
            text: 'Take a single task and finish it — ideally the one carrying the most dread. Waiting until you feel ready is what avoidance sounds like from the inside.',
          },
          {
            label: 'Clear one a day.',
            text: 'Check it off and it’s done for good. Daily contact with the thing you’d rather dodge is what keeps the pile from rebuilding.',
          },
        ]}
        science={[
          {
            label: 'Avoidance pays you instantly.',
            text: 'Dodging a task produces immediate relief, and that relief is a reward. This is negative reinforcement — one of the most durable learning mechanisms there is — which is why avoidance strengthens itself without you ever deciding to.',
          },
          {
            label: 'Doing it collects the counter-evidence.',
            text: 'The dread predicts a cost that almost never arrives, and the prediction only updates when you finish the task and nothing bad happens. That’s the extinction mechanism behind exposure therapy, the best-supported treatment for anxiety.',
          },
          {
            label: 'The tolerance generalizes.',
            text: 'Repeatedly acting before you feel ready trains distress tolerance broadly rather than task by task. Over time discomfort stops functioning as a veto.',
          },
        ]}
        footer="You don’t need the list empty. You need the next one started."
      />
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  infoRow: { alignItems: 'flex-end', marginBottom: Spacing.sm },

  // Intro / empty state
  introCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
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
  },

  // Quick add
  quickAdd: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickAddInput: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    paddingVertical: Spacing.xs,
  },
  quickAddBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quickAddBtnDisabled: {
    opacity: 0.35,
  },
  catToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  catToggleText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  catChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.lightGray,
  },
  catChipSel: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  catChipTextSel: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.white,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statPill: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
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
    letterSpacing: 0.3,
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

  // Remove button on active task cards
  removeBtn: {
    flexShrink: 0,
    padding: 2,
  },

  // Guide-me (interview) secondary link
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  guideText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },

  // Conquered log
  logSection: {
    marginTop: Spacing.md,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  logHeaderText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
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

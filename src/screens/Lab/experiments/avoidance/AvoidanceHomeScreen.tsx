import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import type { AvoidanceStackParamList, AvoidanceTask, Level } from '../../../../types/avoidance';
import { ADD_EXAMPLES, MAX_TASK_LENGTH } from '../../../../data/avoidance';
import {
  daysAvoided,
  describeAvoided,
  OUTCOME_LABEL,
  openTasks,
  outcome,
  streakWeeks,
  todaysRep,
  weekSummary,
} from '../../../../services/avoidanceMath';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { ProgressRing } from '../../../../components/common/ProgressRing';
import { useAvoidance } from './AvoidanceContext';
import { ForecastChips, RateSheet, TaskSheet } from './components/AvoidanceSheets';
import { avs, AVOIDANCE_ACCENT, AVOIDANCE_TINT, levelLabel } from './components/avoidanceStyle';

type Props = NativeStackScreenProps<AvoidanceStackParamList, 'AvoidanceHome'>;

/**
 * Home: write down what you're putting off, face today's rep, see the week.
 * Today's rep is the one you've avoided longest; "Not this one" shows the
 * next, and tomorrow starts over from the oldest.
 */
export const AvoidanceHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { loading, loadError, reload, today, prefs, tasks, addTask, clearTask, oldToImport, importOld, importing, closeApp } =
    useAvoidance();
  const [text, setText] = useState('');
  const [example] = useState(() => ADD_EXAMPLES[Math.floor(Math.random() * ADD_EXAMPLES.length)]);
  const [passed, setPassed] = useState<string[]>([]);
  const [rating, setRating] = useState<AvoidanceTask | null>(null);
  const [editing, setEditing] = useState<AvoidanceTask | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={closeApp} style={avs.headerIconBtn} accessibilityLabel="Close Avoidance Training">
          <Ionicons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={avs.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AvoidanceCleared')}
            style={avs.headerIconBtn}
            accessibilityLabel="Cleared"
          >
            <Ionicons name="checkmark-done-outline" size={23} color={Colors.dark} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('AvoidanceSettings')}
            style={avs.headerIconBtn}
            accessibilityLabel="Avoidance settings"
          >
            <Ionicons name="settings-outline" size={22} color={Colors.dark} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, closeApp]);

  const open = useMemo(() => openTasks(tasks), [tasks]);
  const rep = useMemo(() => todaysRep(open, passed), [open, passed]);
  const week = useMemo(() => weekSummary(tasks, today, prefs.weekly_goal), [tasks, today, prefs.weekly_goal]);
  const streak = useMemo(() => streakWeeks(tasks, today, prefs.weekly_goal), [tasks, today, prefs.weekly_goal]);
  const clearedToday = tasks.filter((t) => t.status === 'done' && t.done_date === today).length;

  if (loading) {
    return (
      <View style={[avs.screen, avs.center]}>
        <ActivityIndicator color={AVOIDANCE_ACCENT} />
      </View>
    );
  }

  const add = async (forecast?: Level) => {
    if (!text.trim()) return;
    const value = text;
    setText('');
    setNote(null);
    if (!(await addTask(value, forecast))) setText(value);
  };

  const rate = async (task: AvoidanceTask, resistance?: Level) => {
    setRating(null);
    const cleared = await clearTask(task, resistance);
    if (!cleared) return;
    const o = outcome(cleared.forecast, cleared.resistance);
    setNote(
      o
        ? `${OUTCOME_LABEL[o]}. You expected “${levelLabel(cleared.forecast)}”; it was “${levelLabel(cleared.resistance)}”.`
        : 'Cleared. That’s a rep.'
    );
  };

  const brought = async () => {
    const n = await importOld();
    if (n) setNote(`Brought over ${n} from the old Avoidance Training, with the days you’d already avoided them.`);
  };

  return (
    <View style={avs.screen}>
      <ScrollView contentContainerStyle={avs.scroll} keyboardShouldPersistTaps="handled">
        {loadError ? (
          <TouchableOpacity style={avs.card} onPress={reload}>
            <Text style={avs.body}>Couldn’t load your list. Tap to try again.</Text>
          </TouchableOpacity>
        ) : null}

        <View style={avs.card}>
          <Text style={avs.title}>What have you been putting off?</Text>
          <TextInput
            style={avs.input}
            value={text}
            onChangeText={setText}
            placeholder={`e.g. ${example}`}
            placeholderTextColor={Colors.gray}
            maxLength={MAX_TASK_LENGTH}
            returnKeyType="done"
            onSubmitEditing={() => add()}
            accessibilityLabel="What have you been putting off?"
          />
          {text.trim() ? (
            <>
              <Text style={styles.label}>How hard will it be to start? Tap to add it.</Text>
              <ForecastChips onPick={(l) => add(l)} />
            </>
          ) : (
            <Text style={avs.muted}>Big job? Write the first step, not the whole thing.</Text>
          )}
        </View>

        {note ? (
          <View style={[avs.card, styles.note]}>
            <Ionicons name="checkmark-circle" size={20} color={AVOIDANCE_ACCENT} />
            <Text style={[avs.body, styles.flex]}>{note}</Text>
          </View>
        ) : null}

        {rep ? (
          <View style={[avs.card, styles.rep]}>
            <Text style={avs.eyebrow}>Today’s rep</Text>
            <Text style={avs.big}>{rep.text}</Text>
            <Text style={avs.muted}>
              {describeAvoided(daysAvoided(rep, today))}
              {rep.forecast ? ` · You expect: ${levelLabel(rep.forecast)}` : ''}
            </Text>
            <TouchableOpacity style={[avs.primaryBtn, styles.repBtn]} onPress={() => setRating(rep)}>
              <Text style={avs.primaryBtnText}>Did it</Text>
            </TouchableOpacity>
            {open.length > 1 ? (
              <TouchableOpacity style={avs.textBtn} onPress={() => setPassed((p) => [...p, rep.id])}>
                <Text style={avs.textBtnText}>Not this one</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : open.length > 0 ? (
          <View style={avs.card}>
            <Text style={avs.body}>That’s every one passed over. Pick from the list below, or come back tomorrow.</Text>
            <TouchableOpacity onPress={() => setPassed([])}>
              <Text style={avs.link}>Start again from the oldest</Text>
            </TouchableOpacity>
          </View>
        ) : tasks.length === 0 ? (
          <View style={avs.card}>
            <Text style={avs.title}>Train the start</Text>
            <Text style={avs.body}>
              Add the things you keep putting off, and how hard you think starting will be. Each day, face one. Most
              turn out easier than you feared, and the list proves it.
            </Text>
          </View>
        ) : (
          <View style={avs.card}>
            <Text style={avs.body}>Nothing left to avoid. Add the next thing when it shows up.</Text>
          </View>
        )}

        {oldToImport.length > 0 ? (
          <TouchableOpacity
            style={[avs.card, styles.import, importing && styles.dim]}
            onPress={brought}
            disabled={importing}
            accessibilityState={{ disabled: importing }}
          >
            <Ionicons name="download-outline" size={20} color={AVOIDANCE_ACCENT} />
            <Text style={[avs.body, styles.flex]}>
              Bring over {oldToImport.length} from the old Avoidance Training
            </Text>
            <Text style={avs.link}>Bring</Text>
          </TouchableOpacity>
        ) : null}

        <View style={[avs.card, styles.week]}>
          <View style={styles.ringWrap}>
            <ProgressRing pct={week.goal ? week.cleared / week.goal : 0} color={AVOIDANCE_ACCENT} />
            <Text style={styles.ringText}>
              {week.cleared}/{week.goal}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text style={avs.title}>This week</Text>
            <Text style={avs.muted}>
              {week.met
                ? 'Weekly goal met.'
                : `${week.goal - week.cleared} more to clear for your goal.`}
              {streak > 1 ? ` ${streak} weeks in a row.` : ''}
              {clearedToday ? ` ${clearedToday} cleared today.` : ''}
            </Text>
          </View>
        </View>

        {open.length > 0 ? (
          <ListGroup title="Still avoiding">
            {open.map((t) => (
              <ListRow
                key={t.id}
                title={t.text}
                subtitle={describeAvoided(daysAvoided(t, today))}
                value={t.forecast ? FORECAST_SHORT[t.forecast] : undefined}
                onPress={() => setEditing(t)}
              />
            ))}
          </ListGroup>
        ) : null}
      </ScrollView>

      <RateSheet task={rating} onClose={() => setRating(null)} onRate={rate} />
      <TaskSheet
        key={editing?.id ?? 'none'}
        task={editing}
        onClose={() => setEditing(null)}
        // After the editor has slid away: iOS drops a sheet opened while another is still closing.
        onDidIt={(t) => setTimeout(() => setRating(t), 450)}
      />
    </View>
  );
};

/** The list's right-hand hint: how much you're dreading it. */
const FORECAST_SHORT: Record<Level, string> = { 1: 'Easy', 2: 'Hard', 3: 'Dreading' };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  note: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rep: { borderColor: AVOIDANCE_ACCENT, backgroundColor: AVOIDANCE_TINT },
  repBtn: { marginTop: Spacing.xs },
  import: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dim: { opacity: 0.5 },
  week: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringText: { position: 'absolute', fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
});

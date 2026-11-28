import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import type { HotColdStackParamList, ThermalKind } from '../../../../types/hotcold';
import { KIND_LABEL, SAFETY_LINE } from '../../../../data/hotcold';
import {
  formatDuration,
  formatTemp,
  groupByDay,
  prefillFor,
  streakWeeks,
  totalMinutes,
  weekSummary,
} from '../../../../services/hotcoldMath';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { ProgressRing } from '../../../../components/common/ProgressRing';
import { useHotCold } from './HotColdContext';
import { LogSheet, LogTarget } from './components/LogSheet';
import { hcs, HOTCOLD_ACCENT, KIND_COLOR, KIND_ICON, ratingLabel } from './components/hotcoldStyle';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<HotColdStackParamList, 'HotColdHome'>;

/**
 * Home: the log and today in one place. Tap Cold or Heat, tap how hard it was
 * to start — logged. Below: this week against the goal, and today's sessions.
 */
export const HotColdHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { loading, loadError, reload, today, prefs, sessions, timer, pendingLog, takePendingLog, unlogged, closeApp } =
    useHotCold();
  const t = useCopy();
  const [target, setTarget] = useState<LogTarget | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const open = (next: LogTarget) => {
    setSheetKey((k) => k + 1);
    setTarget(next);
  };

  // Back from the timer: open the sheet with the real time filled in.
  useEffect(() => {
    if (!pendingLog) return;
    const result = takePendingLog();
    if (result) open({ mode: 'new', kind: result.kind, duration_sec: result.duration_sec, timed: true });
  }, [pendingLog, takePendingLog]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={closeApp} style={hcs.headerIconBtn} accessibilityLabel="Close Hot & Cold">
          <Ionicons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={hcs.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('HotColdHistory')}
            style={hcs.headerIconBtn}
            accessibilityLabel="History and records"
          >
            <Ionicons name="time-outline" size={22} color={Colors.dark} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('HotColdSettings')}
            style={hcs.headerIconBtn}
            accessibilityLabel="Hot & Cold settings"
          >
            <Ionicons name="settings-outline" size={22} color={Colors.dark} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, closeApp]);

  const week = useMemo(() => weekSummary(sessions, today, prefs.weekly_goal), [sessions, today, prefs.weekly_goal]);
  const streak = useMemo(() => streakWeeks(sessions, today, prefs.weekly_goal), [sessions, today, prefs.weekly_goal]);
  const todays = useMemo(
    () => groupByDay(sessions.filter((s) => s.date === today))[0]?.sessions ?? [],
    [sessions, today]
  );

  if (loading) {
    return (
      <View style={[hcs.screen, hcs.center]}>
        <ActivityIndicator color={HOTCOLD_ACCENT} />
      </View>
    );
  }

  const tile = (kind: ThermalKind) => {
    const last = prefillFor(kind, sessions);
    return (
      <TouchableOpacity
        key={kind}
        style={[styles.tile, { borderColor: KIND_COLOR[kind] }]}
        onPress={() => open({ mode: 'new', kind })}
        accessibilityRole="button"
        accessibilityLabel={`Log ${KIND_LABEL[kind].toLowerCase()}`}
      >
        <View style={[styles.tileIcon, { backgroundColor: KIND_COLOR[kind] }]}>
          <Ionicons name={KIND_ICON[kind]} size={26} color={Colors.white} />
        </View>
        <Text style={styles.tileTitle}>{KIND_LABEL[kind]}</Text>
        <Text style={hcs.muted}>
          {formatDuration(last.duration_sec)} · {formatTemp(last.temp_c, prefs.unit)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={hcs.screen}>
      <ScrollView contentContainerStyle={hcs.scroll}>
        {loadError ? (
          <TouchableOpacity style={hcs.card} onPress={reload}>
            <Copy id="hotcold.home.loadFail" style={hcs.body}>Couldn’t load your sessions. Tap to try again.</Copy>
          </TouchableOpacity>
        ) : null}

        {timer ? (
          <TouchableOpacity
            style={[hcs.card, styles.timerBanner]}
            onPress={() => navigation.navigate('HotColdTimer', { kind: timer.kind })}
          >
            <Ionicons name="timer-outline" size={22} color={KIND_COLOR[timer.kind]} />
            <Copy id="hotcold.home.timerRunning" style={[hcs.body, styles.flex]} vars={{ kind: KIND_LABEL[timer.kind] }}>
              {'{kind} timer running'}
            </Copy>
            <Copy id="hotcold.home.open" style={hcs.link}>Open</Copy>
          </TouchableOpacity>
        ) : null}

        {unlogged && !target ? (
          <TouchableOpacity
            style={[hcs.card, styles.timerBanner]}
            onPress={() => open({ mode: 'new', kind: unlogged.kind, duration_sec: unlogged.duration_sec, timed: true })}
          >
            <Ionicons name="timer-outline" size={22} color={KIND_COLOR[unlogged.kind]} />
            <Copy
              id="hotcold.home.unlogged"
              style={[hcs.body, styles.flex]}
              vars={{ kind: KIND_LABEL[unlogged.kind].toLowerCase(), time: formatDuration(unlogged.duration_sec) }}
            >
              {'Timed {kind} · {time} not logged yet'}
            </Copy>
            <Copy id="hotcold.home.logIt" style={hcs.link}>Log it</Copy>
          </TouchableOpacity>
        ) : null}

        <View style={styles.tiles}>{(['cold', 'heat'] as const).map(tile)}</View>
        <Copy id="hotcold.home.tapOne" style={[hcs.muted, styles.centerText]}>
          Tap one to log it. It starts from your last time.
        </Copy>

        {/* One timer draft at a time: log or discard the last timed session first. */}
        {!timer && !unlogged ? (
          <TouchableOpacity
            style={hcs.secondaryBtn}
            onPress={() => navigation.navigate('HotColdTimer', { kind: 'cold' })}
          >
            <Ionicons name="timer-outline" size={18} color={HOTCOLD_ACCENT} />
            <Copy id="hotcold.home.timePlunge" style={hcs.secondaryBtnText}>Time a plunge</Copy>
          </TouchableOpacity>
        ) : null}

        {note ? (
          <View style={[hcs.card, styles.note]}>
            <Ionicons name="checkmark-circle" size={20} color={HOTCOLD_ACCENT} />
            <Text style={[hcs.body, styles.flex]}>{note}</Text>
          </View>
        ) : null}

        <View style={[hcs.card, styles.week]}>
          <View style={styles.ringWrap}>
            <ProgressRing pct={week.goal ? week.sessions / week.goal : 0} color={HOTCOLD_ACCENT} />
            <Text style={styles.ringText}>
              {week.sessions}/{week.goal}
            </Text>
          </View>
          <View style={styles.flex}>
            <Copy id="hotcold.home.thisWeek" style={hcs.title}>This week</Copy>
            <Copy
              id="hotcold.home.weekMinutes"
              style={hcs.body}
              vars={{ cold: totalMinutes(week.coldSec), heat: totalMinutes(week.heatSec) }}
            >
              {'Cold {cold} min · Heat {heat} min'}
            </Copy>
            <Text style={hcs.muted}>
              {week.met
                ? t('hotcold.home.goalMet', 'Weekly goal met.')
                : week.goal - week.sessions === 1
                  ? t('hotcold.home.moreSessions.one', '{n} more session for your goal.', { n: week.goal - week.sessions })
                  : t('hotcold.home.moreSessions.other', '{n} more sessions for your goal.', { n: week.goal - week.sessions })}
              {streak > 1 ? t('hotcold.home.streak', ' {n} weeks in a row.', { n: streak }) : ''}
            </Text>
          </View>
        </View>

        <ListGroup title={t('hotcold.home.today', 'Today')}>
          {todays.length === 0 ? (
            <ListRow title={t('hotcold.home.nothingToday', 'Nothing yet today')} />
          ) : (
            todays.map((s) => (
              <ListRow
                key={s.id}
                icon={{ name: KIND_ICON[s.kind], color: KIND_COLOR[s.kind] }}
                title={`${KIND_LABEL[s.kind]} · ${formatDuration(s.duration_sec)}`}
                subtitle={ratingLabel(s.resistance)}
                value={formatTemp(s.temp_c, prefs.unit)}
                onPress={() => open({ mode: 'edit', session: s })}
              />
            ))
          )}
        </ListGroup>

        <Text style={[hcs.muted, styles.centerText]}>{SAFETY_LINE}</Text>
      </ScrollView>

      <LogSheet key={sheetKey} target={target} onClose={() => setTarget(null)} onSaved={setNote} />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  tiles: { flexDirection: 'row', gap: Spacing.md },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  tileIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark, marginTop: Spacing.xs },
  timerBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  week: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringText: { position: 'absolute', fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
});

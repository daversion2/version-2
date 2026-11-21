import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import { Stepper } from '../../components/common/Stepper';
import { useAuth } from '../../context/AuthContext';
import {
  addAppToToday,
  canRemoveFromToday,
  catalogStatus,
  findCatalogApp,
  hiddenRowsOf,
  removeAppFromToday,
  setRowOnToday,
} from '../../services/appCatalog';
import { setCloseOutReminder } from '../../services/closeOutReminder';
import { ROW_GOAL_NOUNS, rowGoalsOf, saveRowGoal } from '../../services/rowRings';
import { TODAY_APPS } from '../../services/appCheckins';
import { AppSetup, GOAL_NOUNS, loadAppSetup } from '../../services/appSetup';
import { triggerTapHaptic } from '../../utils/haptics';
import { showAlert } from '../../utils/alert';
import type { RootStackParamList } from '../../types/navigation';
import { AppIcon, Badge, Panel } from './AppStoreParts';

// =============================================================================
// ONE APP'S PAGE in the Apps screen: what it is, what you do in it, where the
// override shows up, and the one action that fits (Add to Today / Open).
// A Today app picks its weekly goal here; one already on Today saves a goal
// change straight away, and can be removed (never the last app on Today).
// =============================================================================

type Props = NativeStackScreenProps<RootStackParamList, 'AppStoreDetail'>;
type IconName = keyof typeof Ionicons.glyphMap;
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

export const AppStoreDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user, userProfile, refreshProfile } = useAuth();
  const app = findCatalogApp(route.params.appId);
  const [setup, setSetup] = useState<AppSetup | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // A goal change on an app already on Today saves once the taps stop, with
  // only the latest number, so quick taps can't land out of order. Leaving the
  // screen still saves a pending change.
  const goalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingGoalSave = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      if (goalTimer.current) clearTimeout(goalTimer.current);
      pendingGoalSave.current?.();
    },
    []
  );

  const load = useCallback(() => {
    if (!user || !app) return;
    loadAppSetup(user.uid, userProfile)
      .then((s) => {
        setSetup(s);
        if (app.todayAppId) setGoal(s.goals[app.todayAppId]);
        else if (app.todayRow) setGoal(rowGoalsOf(userProfile)[app.todayRow]);
      })
      .catch((e) => console.warn('App page: loading setup failed', e));
  }, [user, userProfile, app]);

  useFocusEffect(load);

  if (!app) return null;
  const status = setup ? catalogStatus(app, setup.hidden, hiddenRowsOf(userProfile)) : null;
  const todayId = app.todayAppId;
  const row = app.todayRow;

  const save = async (fn: () => Promise<void>, failTitle: string) => {
    setBusy(true);
    try {
      await fn();
      triggerTapHaptic();
      await refreshProfile();
      load();
    } catch (e: any) {
      showAlert(failTitle, e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    if (!user) return;
    if (row) {
      return save(async () => {
        await setRowOnToday(user.uid, userProfile, row, true);
        if (goal !== null) await saveRowGoal(user.uid, row, goal);
      }, 'Couldn’t add it');
    }
    if (!todayId || goal === null) return;
    save(() => addAppToToday(user.uid, userProfile, todayId, goal), 'Couldn’t add it');
  };

  const changeGoal = (next: number) => {
    setGoal(next);
    if (!user || status !== 'onToday') return;
    // On Today already: the goal is live, so save the latest once the taps stop.
    pendingGoalSave.current = () => {
      pendingGoalSave.current = null;
      const saving = row ? saveRowGoal(user.uid, row, next) : todayId ? addAppToToday(user.uid, userProfile, todayId, next) : null;
      saving
        ?.then(() => refreshProfile())
        .catch((e) => showAlert('Couldn’t save the goal', e?.message ?? 'Please try again.'));
    };
    if (goalTimer.current) clearTimeout(goalTimer.current);
    goalTimer.current = setTimeout(() => pendingGoalSave.current?.(), 600);
  };


  const remove = () => {
    if (!user) return;
    if (row === 'nightly') {
      // Its reminder is the evening nudge to close out; it goes with it.
      Alert.alert('Remove Close out the day?', 'This also turns off the evening reminder. Past nights stay.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            save(async () => {
              await setRowOnToday(user.uid, userProfile, 'nightly', false);
              await setCloseOutReminder(user.uid, null);
            }, 'Couldn’t remove it'),
        },
      ]);
      return;
    }
    if (row) return save(() => setRowOnToday(user.uid, userProfile, row, false), 'Couldn’t remove it');
    if (!todayId) return;
    save(() => removeAppFromToday(user.uid, userProfile, todayId), 'Couldn’t remove it');
  };

  const launch = () => {
    if (app.route) return navigation.navigate(app.route);
    const r = TODAY_APPS.find((a) => a.id === todayId)?.route;
    if (r) navigation.navigate(r);
  };

  const primary =
    status === 'addable'
      ? { label: 'Add to Today', onPress: add }
      : { label: status === 'onToday' ? `Open ${app.name}` : 'Open', onPress: launch };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back to Apps"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          <Text style={styles.backText}>Apps</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <AppIcon app={app} size={96} />
          <View style={styles.heroText}>
            <Text style={styles.name} accessibilityRole="header">
              {app.name}
            </Text>
            <Text style={styles.tagline}>{app.tagline}</Text>
            <View style={styles.badges}>
              {status === 'onToday' && <Badge color={Colors.primary} label="On your Today" />}
              {app.isNew && <Badge color={app.color} label="New" />}
            </View>
          </View>
        </View>

        {!setup ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <TouchableOpacity
            style={[styles.primary, busy && styles.primaryBusy]}
            onPress={primary.onPress}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryText}>{primary.label}</Text>}
          </TouchableOpacity>
        )}

        <View style={styles.aboutCard}>
          <Text style={styles.about}>{app.description}</Text>
          <Text style={styles.goodFor}>{app.goodFor}</Text>
        </View>

        <Panel title="What you do in it">
          {app.features.map((f, i) => (
            <View key={f.text} style={[styles.featureRow, i < app.features.length - 1 && styles.separator]}>
              <View style={[styles.featureIcon, { backgroundColor: app.color + '1F' }]}>
                <Ionicons name={f.icon as IconName} size={18} color={Colors.dark} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </Panel>

        <Panel
          title="Where the override shows up"
          footer={app.rated === false ? undefined : '1 to 3 each time. A 3 is never a bad mark: it’s the most training a session can give.'}
        >
          {app.override.map((o, i) => (
            <View key={o.label} style={[styles.overrideRow, i < app.override.length - 1 && styles.separator]}>
              <Text style={styles.overrideLabel}>{o.label}</Text>
              <Text style={styles.overrideText}>{o.text}</Text>
            </View>
          ))}
        </Panel>

        {(todayId || row) && goal !== null && status !== null && (
          <Panel
            title="Weekly goal"
            footer={status === 'onToday' ? 'Saved as you change it.' : 'Pick a number you’d hit on a bad week.'}
          >
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>{capitalize(row ? ROW_GOAL_NOUNS[row] : GOAL_NOUNS[todayId!])} a week</Text>
              <Stepper
                value={goal}
                onChange={changeGoal}
                min={1}
                max={7}
                accessibilityLabel={`${app.name} weekly goal`}
              />
            </View>
          </Panel>
        )}

        {status === 'standalone' && (
          <Text style={styles.note}>Opens on its own for now. Joining Today’s rings and ratings is coming next.</Text>
        )}

        {status === 'onToday' && setup && (row || (todayId && canRemoveFromToday(setup.hidden, todayId))) && (
          <View style={styles.removeWrap}>
            <TouchableOpacity onPress={remove} disabled={busy} accessibilityRole="button" style={styles.remove}>
              <Text style={styles.removeText}>Remove from Today</Text>
            </TouchableOpacity>
            <Text style={styles.note}>
              {row === 'nightly' ? 'Also turns off the evening reminder. Past nights stay.' : 'Its history stays. Add it back any time.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.lg },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, marginLeft: -6 },
  backText: { ...TextStyles.body, color: Colors.primary },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: 4, marginTop: -Spacing.sm },
  heroText: { flex: 1, gap: 4 },
  name: { ...TextStyles.title1, color: Colors.dark },
  tagline: { ...TextStyles.subhead, color: Colors.gray },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  primary: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBusy: { opacity: 0.7 },
  primaryText: { ...TextStyles.headline, color: Colors.white },
  aboutCard: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
  about: { ...TextStyles.body, color: Colors.dark },
  goodFor: { ...TextStyles.subhead, color: Colors.gray },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, marginHorizontal: Spacing.md },
  featureIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  featureText: { ...TextStyles.callout, color: Colors.dark, flex: 1 },
  overrideRow: { paddingVertical: 12, marginHorizontal: Spacing.md, gap: 2 },
  overrideLabel: { ...TextStyles.headline, color: Colors.dark },
  overrideText: { ...TextStyles.subhead, color: Colors.label2 },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    minHeight: 52,
  },
  goalLabel: { ...TextStyles.body, color: Colors.dark, flex: 1 },
  note: { ...TextStyles.footnote, color: Colors.gray, textAlign: 'center', paddingHorizontal: Spacing.lg },
  removeWrap: { gap: 6, alignItems: 'center' },
  remove: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md },
  removeText: { ...TextStyles.body, color: Colors.danger },
});

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import { LargeTitle } from '../../components/common/LargeTitle';
import { ListGroup, ListRow } from '../../components/common/ListGroup';
import { BottomSheet } from '../../components/common/BottomSheet';
import { InputField } from '../../components/common/InputField';
import { Button } from '../../components/common/Button';
import { PodAvatar, PodSessionLine, ReactionSheet } from '../../components/pods/PodParts';
import { Copy } from '../../components/common/Copy';
import { useAuth } from '../../context/AuthContext';
import { useCopy } from '../../context/CopyContext';
import { loadAppSetup } from '../../services/appSetup';
import { cleanFirstName } from '../../services/podMath';
import {
  buildPodView,
  inviteMessage,
  leaveMyPod,
  loadPod,
  makeNewInvite,
  podErrorMessage,
  podGoalsFrom,
  removeFromMyPod,
  sendPodReaction,
  setPodFirstName,
  setPodFriction,
  setPodMuted,
  syncPodMember,
  type PodData,
  type PodMemberRow,
  type PodSessionView,
} from '../../services/pods';
import { DAY_NAMES } from '../../utils/date';
import { showAlert, showConfirm } from '../../utils/alert';
import { triggerTapHaptic } from '../../utils/haptics';
import type { RootStackParamList } from '../../types/navigation';

// =============================================================================
// YOUR POD (docs/pods.md): who showed up today and how hard it was, reactions,
// a nudge for whoever hasn't yet, the week, the invite, and your settings.
// Everything shown is built by buildPodView (services/pods.ts, tested); this
// screen only lays it out and calls the services.
// =============================================================================

type Props = NativeStackScreenProps<RootStackParamList, 'Pod'>;

const dayLetter = (day: string) => DAY_NAMES[new Date(`${day}T12:00:00`).getDay()].charAt(0);

export const PodScreen: React.FC<Props> = ({ navigation }) => {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const { user, userProfile, refreshProfile } = useAuth();
  const podId = userProfile?.pod_id;
  const [data, setData] = useState<PodData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'gone'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [reactTo, setReactTo] = useState<{ member: PodMemberRow; session: PodSessionView } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !podId) return;
    try {
      const next = await loadPod(podId);
      if (!next || !next.pod.member_ids.includes(user.uid)) {
        // Removed, or the pod is gone: the profile catches up.
        setState('gone');
        refreshProfile().catch(() => undefined);
        return;
      }
      setData(next);
      setState('ready');
      // Keep my goals and time zone current. Best-effort, after the screen shows.
      const mine = next.members.find((m) => m.uid === user.uid);
      if (mine) {
        loadAppSetup(user.uid, userProfile)
          .then((s) => syncPodMember(user.uid, podId, mine, podGoalsFrom(s.goals, s.hidden)))
          .catch((e) => console.warn('Pod: syncing goals failed', e));
      }
    } catch (e) {
      console.warn('Pod: loading failed', e);
      setState((s) => (s === 'ready' ? s : 'error'));
    }
  }, [user, podId, userProfile, refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /** One action at a time: run it, then reload (unless it took you out of the pod). */
  const run = async (key: string, fn: () => Promise<unknown>, after?: () => unknown, reload = true) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
      triggerTapHaptic();
      await after?.();
      if (reload) await load();
    } catch (e) {
      showAlert(t('pods.screen.failed', 'Couldn’t do that'), podErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const back = { label: t('pods.screen.back', 'Back'), onPress: () => navigation.goBack() };

  // Not in a pod (never joined, left, or removed).
  if (!podId || state === 'gone') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.content}>
          <LargeTitle title={t('pods.screen.title', 'Your pod')} back={back} />
          <View style={styles.card}>
            {state === 'gone' ? (
              <Copy id="pods.screen.gone" style={styles.headline}>You’re not in this pod any more.</Copy>
            ) : (
              <Copy id="pods.screen.train" style={styles.headline}>Train alongside someone.</Copy>
            )}
            <Copy id="pods.screen.pitch" style={styles.body}>
              A partner, or up to 5 people. You see that each other showed up today, and how hard it was.
            </Copy>
          </View>
          <Button title={t('pods.screen.start', 'Start a pod')} onPress={() => navigation.replace('PodSetup', { mode: 'start' })} />
          <Button title={t('pods.screen.join', 'Join with a code')} variant="outline" onPress={() => navigation.replace('PodSetup', { mode: 'join' })} />
        </View>
      </View>
    );
  }

  if (!user || !data || state !== 'ready') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.content}>
          <LargeTitle title={t('pods.screen.title', 'Your pod')} back={back} />
          <View style={styles.loading}>
            {state === 'error' ? (
              <>
                <Copy id="pods.screen.loadFailed" style={styles.body}>Couldn’t load your pod. Check your connection.</Copy>
                <Button title={t('pods.screen.retry', 'Try again')} variant="outline" onPress={() => { setState('loading'); load(); }} />
              </>
            ) : (
              <ActivityIndicator color={Colors.primary} />
            )}
          </View>
        </View>
      </View>
    );
  }

  const view = buildPodView(data, user.uid);
  const me = data.members.find((m) => m.uid === user.uid);
  const others = view.members.filter((m) => !m.isMe);

  const shareInvite = async (code: string) => {
    await Share.share({ message: inviteMessage(me?.first_name, code) }).catch(() => undefined);
  };

  const react = (preset: string) => {
    if (!reactTo) return;
    const { member, session } = reactTo;
    run(
      'react',
      () => sendPodReaction({ to: member.uid, kind: 'reaction', preset, sessionId: session.id, forDay: session.day }),
      () => setReactTo(null)
    );
  };

  const nudge = (m: PodMemberRow) =>
    run(`nudge:${m.uid}`, () => sendPodReaction({ to: m.uid, kind: 'nudge', preset: 'with_you' }));

  const leave = () =>
    showConfirm(
      t('pods.screen.leave.title', 'Leave the pod?'),
      view.members.length <= 1
        ? t('pods.screen.leave.last', 'You’re the last one in it, so the pod is deleted.')
        : t('pods.screen.leave.message', 'Your shared days leave with you. You can join again with a new code.'),
      () =>
        run(
          'leave',
          leaveMyPod,
          async () => {
            await refreshProfile();
            navigation.goBack();
          },
          false
        ),
      t('pods.screen.leave.confirm', 'Leave')
    );

  const remove = (m: PodMemberRow) =>
    showConfirm(
      t('pods.screen.remove.title', 'Remove {name}?', { name: m.name }),
      t('pods.screen.remove.message', 'Their shared days leave the pod with them.'),
      () => run(`remove:${m.uid}`, () => removeFromMyPod(m.uid)),
      t('pods.screen.remove.confirm', 'Remove')
    );

  const saveName = () => {
    const name = editingName ?? '';
    run('name', () => setPodFirstName(user.uid, podId, name), () => {
      setEditingName(null);
      refreshProfile().catch(() => undefined);
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + Spacing.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <LargeTitle
          title={t('pods.screen.title', 'Your pod')}
          eyebrow={t('pods.screen.eyebrow', '{n} of 5', { n: view.members.length })}
          back={back}
        />

        {/* The week, the streak, everyone days. */}
        <View style={styles.card}>
          {view.everyoneToday ? (
            <Copy id="pods.screen.everyoneToday" style={styles.everyone}>Everyone showed up today</Copy>
          ) : null}
          <Text style={styles.headline}>{view.weekLine}</Text>
          <Text style={styles.body}>
            {view.streakLine}
            {view.everyone.total > 0
              ? t('pods.screen.everyoneTotal', ' · {n} everyone {days}', {
                  n: view.everyone.total,
                  days:
                    view.everyone.total === 1
                      ? t('pods.screen.everyoneDay', 'day')
                      : t('pods.screen.everyoneDays', 'days'),
                }) +
                (view.everyone.best > 1
                  ? t('pods.screen.bestRun', ', best run {n}', { n: view.everyone.best })
                  : '')
              : ''}
          </Text>
        </View>

        {view.alone ? (
          <View style={styles.card}>
            <Copy id="pods.screen.inviteHeadline" style={styles.headline}>Invite someone</Copy>
            <Copy id="pods.screen.inviteBody" style={styles.body}>A pod starts counting once a second person joins.</Copy>
          </View>
        ) : null}

        {/* Today, one card per member. */}
        <ListGroup title={t('pods.screen.today', 'TODAY')}>
          {view.members.map((m, i) => (
            <View key={m.uid} style={[styles.member, i < view.members.length - 1 && styles.memberSeparator]}>
              <View style={styles.memberTop}>
                <PodAvatar initial={m.initial} showedUp={m.showedUpToday} />
                <View style={styles.memberText}>
                  <Text style={styles.memberName}>
                    {m.isMe ? t('pods.screen.nameYou', '{name} (you)', { name: m.name }) : m.name}
                  </Text>
                  <Text style={styles.memberStatus}>
                    {m.showedUpToday ? t('pods.screen.showedUp', 'Showed up') : t('pods.screen.notYet', 'Not yet today')}
                  </Text>
                </View>
                {m.canNudge ? (
                  <TouchableOpacity
                    style={[styles.nudge, busy === `nudge:${m.uid}` && styles.disabled]}
                    disabled={!!busy}
                    onPress={() => nudge(m)}
                    accessibilityRole="button"
                    accessibilityLabel={`Nudge ${m.name}`}
                  >
                    <Copy id="pods.screen.nudge" style={styles.nudgeText}>Nudge</Copy>
                  </TouchableOpacity>
                ) : m.nudgedByMe ? (
                  <Copy id="pods.screen.nudged" style={styles.nudged}>Nudged</Copy>
                ) : null}
              </View>
              {m.sessionsToday.map((s) => (
                <PodSessionLine key={s.id} session={s} onPress={() => setReactTo({ member: m, session: s })} />
              ))}
            </View>
          ))}
        </ListGroup>

        {/* The week at a glance: a row per member, a dot per day. */}
        <ListGroup title={t('pods.screen.last7', 'LAST 7 DAYS')}>
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <Text style={styles.gridName} />
              {view.weekDays.map((d) => (
                <Text key={d} style={styles.gridDay}>
                  {dayLetter(d)}
                </Text>
              ))}
            </View>
            {view.members.map((m) => (
              <View key={m.uid} style={styles.gridRow} accessible accessibilityLabel={`${m.name}: showed up ${m.week.filter(Boolean).length} of the last 7 days`}>
                <Text style={styles.gridName} numberOfLines={1}>
                  {m.isMe ? t('pods.screen.you', 'You') : m.name}
                </Text>
                {m.week.map((on, i) => (
                  <View key={i} style={styles.gridCell}>
                    <View style={[styles.gridDot, on ? styles.gridDotOn : styles.gridDotOff]} />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ListGroup>

        {/* Invite. */}
        {view.members.length < 5 ? (
          <ListGroup
            title={t('pods.screen.invite', 'INVITE')}
            footer={
              view.invite?.live
                ? t('pods.screen.inviteLive', 'Works until {date}. Any member can make a new one.', {
                    date: new Date(view.invite.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                  })
                : t('pods.screen.inviteNone', 'Make a new code to invite someone.')
            }
          >
            {view.invite?.live ? (
              <ListRow
                title={view.invite.code.split('').join(' ')}
                subtitle={t('pods.screen.podCode', 'Pod code')}
                right={<Copy id="pods.screen.share" style={styles.link}>Share</Copy>}
                onPress={() => shareInvite(view.invite!.code)}
                accessibilityLabel={`Pod code ${view.invite.code.split('').join(' ')}. Share it.`}
              />
            ) : null}
            <ListRow
              title={t('pods.screen.newCode', 'New code')}
              tint="accent"
              separator={false}
              onPress={() =>
                run('invite', async () => {
                  const { code } = await makeNewInvite();
                  await shareInvite(code);
                })
              }
            />
          </ListGroup>
        ) : null}

        {/* Me. */}
        <ListGroup title={t('pods.screen.you.group', 'YOU')}>
          <ListRow
            title={t('pods.screen.firstName', 'Your first name')}
            value={me?.first_name}
            chevron
            onPress={() => setEditingName(me?.first_name ?? '')}
          />
          <ListRow
            title={t('pods.screen.shareFriction', 'Share how hard it was')}
            subtitle={t('pods.screen.shareFrictionSub', 'Off: your pod sees that you did it, not how hard.')}
            right={
              <Switch
                value={me?.share_friction !== false}
                disabled={!!busy}
                onValueChange={(v) => me && run('friction', () => setPodFriction(user.uid, podId, v, me.days))}
                trackColor={{ true: Colors.primary, false: Colors.fill }}
                accessibilityLabel="Share how hard it was"
              />
            }
          />
          <ListRow
            title={t('pods.screen.mute', 'Mute pod notifications')}
            separator={false}
            right={
              <Switch
                value={userProfile?.pod_muted === true}
                disabled={!!busy}
                onValueChange={(v) => run('mute', () => setPodMuted(user.uid, v), () => refreshProfile().catch(() => undefined))}
                trackColor={{ true: Colors.primary, false: Colors.fill }}
                accessibilityLabel="Mute pod notifications"
              />
            }
          />
        </ListGroup>

        {view.isStarter && others.length > 0 ? (
          <ListGroup
            title={t('pods.screen.members', 'MEMBERS')}
            footer={t('pods.screen.membersFooter', 'You started this pod, so you can remove someone.')}
          >
            {others.map((m, i) => (
              <ListRow
                key={m.uid}
                title={m.name}
                right={<Copy id="pods.screen.removeRow" style={styles.remove}>Remove</Copy>}
                onPress={() => remove(m)}
                separator={i < others.length - 1}
                accessibilityLabel={`Remove ${m.name}`}
              />
            ))}
          </ListGroup>
        ) : null}

        <ListGroup>
          <ListRow title={t('pods.screen.leaveRow', 'Leave the pod')} tint="destructive" separator={false} onPress={leave} />
        </ListGroup>
      </ScrollView>

      <ReactionSheet
        target={reactTo ? { name: reactTo.member.name, appLabel: reactTo.session.appLabel } : null}
        sending={busy === 'react'}
        onPick={react}
        onClose={() => setReactTo(null)}
      />

      <BottomSheet visible={editingName !== null} onClose={() => setEditingName(null)} title={t('pods.screen.firstName', 'Your first name')} avoidKeyboard>
        <InputField
          label={t('pods.screen.callsYou', 'What your pod calls you')}
          value={editingName ?? ''}
          onChangeText={setEditingName}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={20}
          error={
            (editingName ?? '').trim() && !cleanFirstName(editingName)
              ? t('pods.screen.lettersOnly', 'Letters only, up to 20.')
              : undefined
          }
        />
        <Button title={t('pods.screen.save', 'Save')} onPress={saveName} loading={busy === 'name'} disabled={!cleanFirstName(editingName) || !!busy} />
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { paddingHorizontal: Spacing.md, gap: 20 },
  loading: { paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  card: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, padding: 20, gap: 4 },
  everyone: { ...TextStyles.footnote, fontWeight: '700', color: Colors.secondary, letterSpacing: 0.3 },
  headline: { ...TextStyles.headline, color: Colors.dark },
  body: { ...TextStyles.subhead, color: Colors.label2 },
  member: { paddingHorizontal: Spacing.md, paddingVertical: 12, gap: 4 },
  memberSeparator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberText: { flex: 1, gap: 1 },
  memberName: { ...TextStyles.body, color: Colors.dark },
  memberStatus: { ...TextStyles.footnote, color: Colors.gray },
  nudge: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
  },
  nudgeText: { ...TextStyles.subhead, fontWeight: '600', color: Colors.primary },
  nudged: { ...TextStyles.footnote, color: Colors.gray },
  disabled: { opacity: 0.5 },
  grid: { paddingHorizontal: Spacing.md, paddingVertical: 12, gap: 10 },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  gridName: { ...TextStyles.footnote, color: Colors.label2, width: 72 },
  gridDay: { ...TextStyles.caption, color: Colors.gray, flex: 1, textAlign: 'center' },
  gridCell: { flex: 1, alignItems: 'center' },
  gridDot: { width: 14, height: 14, borderRadius: 7 },
  gridDotOn: { backgroundColor: Colors.primary },
  gridDotOff: { backgroundColor: Colors.fill },
  link: { ...TextStyles.body, color: Colors.primary, paddingRight: Spacing.md },
  remove: { ...TextStyles.body, color: Colors.secondary, paddingRight: Spacing.md },
});

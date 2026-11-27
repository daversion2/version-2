import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import { LargeTitle } from '../../components/common/LargeTitle';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { InputField } from '../../components/common/InputField';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { loadAppSetup } from '../../services/appSetup';
import { cleanFirstName, normalizeInviteCode, suggestedFirstName } from '../../services/podMath';
import { inviteMessage, joinPodWithCode, podErrorMessage, podGoalsFrom, startPod } from '../../services/pods';
import { triggerTapHaptic } from '../../utils/haptics';
import type { RootStackParamList } from '../../types/navigation';

// =============================================================================
// START OR JOIN A POD (docs/pods.md). One screen: pick Start or Join, your
// first name (pre-filled from your profile or Google name), whether to share
// how hard it was (on by default), and for Join the code. Starting opens the
// share sheet with the invite, then the Pod screen.
// =============================================================================

type Props = NativeStackScreenProps<RootStackParamList, 'PodSetup'>;
type Mode = 'start' | 'join';

export const PodSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user, userProfile, refreshProfile } = useAuth();
  const [mode, setMode] = useState<Mode>(route.params?.mode ?? 'start');
  const [name, setName] = useState(
    () => userProfile?.first_name ?? suggestedFirstName(null, user?.displayName) ?? ''
  );
  const [code, setCode] = useState('');
  const [shareFriction, setShareFriction] = useState(true);
  const [goals, setGoals] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAppSetup(user.uid, userProfile)
      .then((s) => setGoals(podGoalsFrom(s.goals, s.hidden)))
      .catch((e) => {
        console.warn('Pod setup: loading goals failed', e);
        setGoals({});
      });
  }, [user, userProfile]);

  const cleanName = cleanFirstName(name);
  const cleanCode = normalizeInviteCode(code);
  const ready = !!cleanName && goals !== null && (mode === 'start' || !!cleanCode);

  const submit = async () => {
    if (!ready || busy || !cleanName || !goals) return;
    setBusy(true);
    setError(null);
    const input = { firstName: cleanName, goals, shareFriction };
    try {
      if (mode === 'start') {
        const { code: newCode } = await startPod(input);
        await refreshProfile();
        triggerTapHaptic();
        // The invite first; then the pod, whatever they did with the sheet.
        await Share.share({ message: inviteMessage(cleanName, newCode) }).catch(() => undefined);
      } else {
        await joinPodWithCode(cleanCode as string, input);
        await refreshProfile();
        triggerTapHaptic();
      }
      navigation.replace('Pod');
    } catch (e) {
      setError(podErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + Spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <LargeTitle title="Your pod" back={{ label: 'Back', onPress: () => navigation.goBack() }} />

        <Text style={styles.lead}>
          A partner, or up to 5 people. You see that each other showed up today, and how hard it was. Nothing else:
          not your meals, weights or notes.
        </Text>

        <SegmentedControl
          options={[
            { value: 'start', label: 'Start a pod' },
            { value: 'join', label: 'Join with a code' },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
          accessibilityLabel="Start a pod or join one"
        />

        <View style={styles.card}>
          {mode === 'join' ? (
            <InputField
              label="Invite code"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="6 letters and numbers"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              error={code.length >= 6 && !cleanCode ? 'That isn’t a pod code.' : undefined}
            />
          ) : null}
          <InputField
            label="Your first name"
            value={name}
            onChangeText={setName}
            placeholder="What your pod calls you"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={20}
            textContentType="givenName"
            error={name.trim().length > 0 && !cleanName ? 'Letters only, up to 20.' : undefined}
          />
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Share how hard it was</Text>
              <Text style={styles.switchSub}>
                Your pod sees “Almost didn’t · Took everything”, not just that you did it. Change it any time.
              </Text>
            </View>
            <Switch
              value={shareFriction}
              onValueChange={setShareFriction}
              trackColor={{ true: Colors.primary, false: Colors.fill }}
              accessibilityLabel="Share how hard it was"
            />
          </View>
        </View>

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Button
          title={mode === 'start' ? 'Start and invite' : 'Join the pod'}
          onPress={submit}
          loading={busy}
          disabled={!ready || busy}
        />
        {mode === 'start' ? (
          <Text style={styles.note}>You get a code to send. It works for 7 days, or until the pod has 5.</Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { paddingHorizontal: Spacing.md, gap: 20 },
  lead: { ...TextStyles.body, color: Colors.label2, paddingHorizontal: 4 },
  card: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, padding: Spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  switchText: { flex: 1, gap: 2 },
  switchTitle: { ...TextStyles.body, color: Colors.dark },
  switchSub: { ...TextStyles.footnote, color: Colors.gray },
  error: { ...TextStyles.subhead, color: Colors.secondary, paddingHorizontal: 4 },
  note: { ...TextStyles.footnote, color: Colors.gray, textAlign: 'center' },
});

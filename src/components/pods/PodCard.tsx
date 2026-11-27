import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import { buildPodView, loadPod, type PodView } from '../../services/pods';
import { PodAvatar } from './PodParts';

// =============================================================================
// Today's Pod card (docs/pods.md; behind the Lab switch "pods" for now).
// In a pod: everyone's initial, filled once they've shown up today, and the
// week and streak. Not in one: an invitation to start or join. Tap → Pod.
// Loads its own data on focus so Today's dashboard load isn't held up by it.
// =============================================================================

export const PodCard: React.FC<{ userId: string; podId?: string; onOpen: () => void }> = ({ userId, podId, onOpen }) => {
  const [view, setView] = useState<PodView | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      if (!podId) {
        setView(null);
        return;
      }
      loadPod(podId)
        .then((data) => {
          if (live) setView(data && data.pod.member_ids.includes(userId) ? buildPodView(data, userId) : null);
        })
        .catch((e) => console.warn('Pod card: loading failed', e));
      return () => {
        live = false;
      };
    }, [podId, userId])
  );

  if (!podId || !view) {
    return (
      <TouchableOpacity style={styles.card} onPress={onOpen} accessibilityRole="button">
        <View style={styles.row}>
          <View style={styles.text}>
            <Text style={styles.label}>Your pod</Text>
            <Text style={styles.headline}>Train alongside someone</Text>
            <Text style={styles.sub}>See each other show up, and how hard it was.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </TouchableOpacity>
    );
  }

  const showedUp = view.members.filter((m) => m.showedUpToday).length;
  const status = view.alone
    ? 'Invite someone to start counting'
    : view.everyoneToday
    ? 'Everyone showed up today'
    : `${showedUp} of ${view.members.length} showed up today`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Your pod. ${status}. ${view.weekLine}. ${view.streakLine}.`}
    >
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.label}>Your pod</Text>
          <Text style={[styles.headline, view.everyoneToday && styles.everyone]}>{status}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
      </View>
      <View style={styles.avatars}>
        {view.members.map((m) => (
          <View key={m.uid} style={styles.person}>
            <PodAvatar initial={m.initial} showedUp={m.showedUpToday} />
            <Text style={styles.name} numberOfLines={1}>
              {m.isMe ? 'You' : m.name}
            </Text>
          </View>
        ))}
      </View>
      {!view.alone ? <Text style={styles.sub}>{`${view.weekLine} · ${view.streakLine}`}</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, padding: 20, gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  text: { flex: 1, gap: 2 },
  label: { ...TextStyles.footnote, fontWeight: '600', color: Colors.gray },
  headline: { ...TextStyles.headline, color: Colors.dark },
  everyone: { color: Colors.secondary },
  sub: { ...TextStyles.subhead, color: Colors.label2 },
  avatars: { flexDirection: 'row', gap: Spacing.md },
  person: { alignItems: 'center', gap: 4, width: 52 },
  name: { ...TextStyles.caption, color: Colors.label2 },
});

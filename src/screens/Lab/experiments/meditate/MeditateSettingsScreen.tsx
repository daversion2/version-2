import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { NsdrLink } from '../../../../types/meditate';
import { clampWeeklyGoal } from '../../../../services/appCheckins';
import { WeeklyGoalPicker } from '../../../../components/miniapps/WeeklyGoalPicker';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { useMeditate } from './MeditateContext';
import { NsdrLinkForm } from './components/NsdrLinkForm';
import { MEDITATE_ACCENT, ms } from './components/meditateStyle';

const BELL_STATUS = {
  granted: 'On — the bell rings when a timed session ends, phone locked or not.',
  denied: 'Off — notifications are blocked for Neuro-Nudge, so no bell rings. Timed sessions still run.',
  undetermined: 'Not set yet — you’ll be asked the first time you begin a timed session.',
} as const;

export const MeditateSettingsScreen: React.FC = () => {
  const { prefs, updatePrefs, bellPermission } = useMeditate();
  const [adding, setAdding] = useState(false);

  const save = (changes: Parameters<typeof updatePrefs>[0]) =>
    updatePrefs(changes).catch(() => showAlert("Couldn't save that", 'Check your connection and try again.'));

  const addRecording = (link: NsdrLink) => {
    save({ nsdr_links: [...prefs.nsdr_links, link] });
    setAdding(false);
  };

  const removeRecording = (link: NsdrLink) =>
    showConfirm(`Remove “${link.title}”?`, 'Sessions already done with it keep its name.', () =>
      save({ nsdr_links: prefs.nsdr_links.filter((l) => l.id !== link.id) }),
    'Remove');

  return (
    <ScrollView style={ms.screen} contentContainerStyle={ms.scroll} keyboardShouldPersistTaps="handled">
      <Text style={ms.sectionLabel}>Weekly goal</Text>
      <WeeklyGoalPicker
        noun="sessions"
        value={clampWeeklyGoal(prefs.weekly_goal, 'meditate')}
        accent={MEDITATE_ACCENT}
        onChange={(n) => save({ weekly_goal: n })}
      />
      <Text style={ms.muted}>
        Shown on Today as “2 of 5 this week”. A week that falls short gets the usual one-tap “what got in the way?”.
      </Text>

      <Text style={ms.sectionLabel}>The bell</Text>
      <View style={[ms.card, styles.bell]}>
        <Ionicons
          name={bellPermission === 'granted' ? 'notifications-outline' : 'notifications-off-outline'}
          size={20}
          color={bellPermission === 'denied' ? Colors.danger : MEDITATE_ACCENT}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={ms.body}>{BELL_STATUS[bellPermission]}</Text>
          {bellPermission === 'denied' && (
            <TouchableOpacity onPress={() => Linking.openSettings()}>
              <Text style={styles.link}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={ms.muted}>
        The bell is your phone’s notification sound. A Focus mode or Do Not Disturb can silence it.
      </Text>

      <Text style={ms.sectionLabel}>NSDR recordings</Text>
      {prefs.nsdr_links.length === 0 && !adding && (
        <Text style={ms.muted}>None yet. Begin on NSDR opens the one you pick.</Text>
      )}
      {prefs.nsdr_links.map((l) => (
        <View key={l.id} style={[ms.card, styles.row]}>
          <View style={{ flex: 1 }}>
            <Text style={ms.title}>{l.title}</Text>
            <Text style={ms.muted} numberOfLines={1}>
              {l.url}
            </Text>
          </View>
          <TouchableOpacity onPress={() => removeRecording(l)} hitSlop={8} accessibilityLabel={`Remove ${l.title}`}>
            <Ionicons name="trash-outline" size={20} color={Colors.gray} />
          </TouchableOpacity>
        </View>
      ))}
      {adding ? (
        <NsdrLinkForm onAdd={addRecording} onCancel={() => setAdding(false)} />
      ) : (
        <TouchableOpacity onPress={() => setAdding(true)} style={styles.add}>
          <Ionicons name="add" size={16} color={MEDITATE_ACCENT} />
          <Text style={styles.link}>Add a recording</Text>
        </TouchableOpacity>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  bell: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  link: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: MEDITATE_ACCENT },
});

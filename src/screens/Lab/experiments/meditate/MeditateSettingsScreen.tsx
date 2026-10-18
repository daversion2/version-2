import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { NsdrLink } from '../../../../types/meditate';
import { isHabitLinkedToMiniApp } from '../../../../services/miniApps';
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
  const { prefs, updatePrefs, habits, bellPermission } = useMeditate();
  const [adding, setAdding] = useState(false);

  const save = (changes: Parameters<typeof updatePrefs>[0]) =>
    updatePrefs(changes).catch(() => showAlert("Couldn't save that", 'Check your connection and try again.'));

  const toggleLink = (habitId: string, on: boolean) => {
    const ids = new Set(prefs.linked_habit_ids);
    if (on) ids.add(habitId);
    else ids.delete(habitId);
    save({ linked_habit_ids: [...ids] });
  };

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

      <Text style={ms.sectionLabel}>Habits that open Meditate</Text>
      <Text style={ms.muted}>
        A linked habit gets a Start button on Today (with the Lab switch on), and finishing a session checks it off.
      </Text>
      {habits.length === 0 && <Text style={ms.muted}>No active habits yet.</Text>}
      {habits.map((h) => {
        const automatic = isHabitLinkedToMiniApp('meditate', h);
        const linked = automatic || prefs.linked_habit_ids.includes(h.id);
        return (
          <View key={h.id} style={[ms.card, styles.row]}>
            <View style={{ flex: 1 }}>
              <Text style={ms.title}>{h.name}</Text>
              {automatic && <Text style={ms.muted}>Linked automatically</Text>}
            </View>
            <Switch
              value={linked}
              disabled={automatic}
              onValueChange={(on) => toggleLink(h.id, on)}
              trackColor={{ true: MEDITATE_ACCENT }}
            />
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  bell: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  link: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: MEDITATE_ACCENT },
});

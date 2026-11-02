import React, { useState } from 'react';
import { Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../../../constants/theme';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { NsdrLink } from '../../../../types/meditate';
import { clampWeeklyGoal } from '../../../../services/appCheckins';
import { WeeklyGoalPicker } from '../../../../components/miniapps/WeeklyGoalPicker';
import { showAlert, showConfirm } from '../../../../utils/alert';
import { useMeditate } from './MeditateContext';
import { NsdrLinkForm } from './components/NsdrLinkForm';
import { MEDITATE_ACCENT, ms } from './components/meditateStyle';

const BELL_STATUS = {
  granted: 'On. The bell rings when a timed session ends, phone locked or not.',
  denied: 'Off. Notifications are blocked for Neuro-Nudge, so no bell rings. Timed sessions still run.',
  undetermined: 'Not set yet. You’ll be asked the first time you begin a timed session.',
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

      <ListGroup
        title="The bell"
        footer="The bell is your phone’s notification sound, so the silent switch, a Focus mode or Do Not Disturb can quiet it."
      >
        <ListRow
          title={BELL_STATUS[bellPermission]}
          icon={{
            name: bellPermission === 'granted' ? 'notifications' : 'notifications-off',
            color: bellPermission === 'denied' ? Colors.danger : MEDITATE_ACCENT,
          }}
        />
        {bellPermission === 'denied' && (
          <ListRow title="Open Settings" tint="accent" chevron={false} onPress={() => Linking.openSettings()} />
        )}
      </ListGroup>

      <ListGroup
        title="NSDR recordings"
        footer={prefs.nsdr_links.length === 0 && !adding ? 'None yet. Begin on NSDR opens the one you pick.' : undefined}
      >
        {prefs.nsdr_links.map((l) => (
          <ListRow
            key={l.id}
            title={l.title}
            subtitle={l.url}
            right={
              <TouchableOpacity
                onPress={() => removeRecording(l)}
                style={styles.remove}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${l.title}`}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.gray} />
              </TouchableOpacity>
            }
          />
        ))}
        {!adding && <ListRow title="Add a recording" tint="accent" chevron={false} onPress={() => setAdding(true)} />}
      </ListGroup>
      {adding && <NsdrLinkForm onAdd={addRecording} onCancel={() => setAdding(false)} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginVertical: -Spacing.sm },
});

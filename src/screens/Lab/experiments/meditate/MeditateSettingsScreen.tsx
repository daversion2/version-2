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
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

const BELL_STATUS = {
  granted: 'On. The bell rings when a timed session ends, phone locked or not.',
  denied: 'Off. Notifications are blocked for Neuro-Nudge, so no bell rings. Timed sessions still run.',
  undetermined: 'Not set yet. You’ll be asked the first time you begin a timed session.',
} as const;

export const MeditateSettingsScreen: React.FC = () => {
  const t = useCopy();
  const { prefs, updatePrefs, bellPermission } = useMeditate();
  const [adding, setAdding] = useState(false);

  const save = (changes: Parameters<typeof updatePrefs>[0]) =>
    updatePrefs(changes).catch(() => showAlert(t('meditate.settings.saveFail.title', "Couldn't save that"), t('meditate.settings.saveFail.message', 'Check your connection and try again.')));

  const addRecording = (link: NsdrLink) => {
    save({ nsdr_links: [...prefs.nsdr_links, link] });
    setAdding(false);
  };

  const removeRecording = (link: NsdrLink) =>
    showConfirm(
      t('meditate.settings.remove.title', 'Remove “{title}”?', { title: link.title }),
      t('meditate.settings.remove.message', 'Sessions already done with it keep its name.'),
      () => save({ nsdr_links: prefs.nsdr_links.filter((l) => l.id !== link.id) }),
      t('meditate.settings.remove.confirm', 'Remove'),
    );

  return (
    <ScrollView style={ms.screen} contentContainerStyle={ms.scroll} keyboardShouldPersistTaps="handled">
      <Copy id="meditate.settings.weeklyGoal" style={ms.sectionLabel}>Weekly goal</Copy>
      <WeeklyGoalPicker
        noun={t('meditate.settings.noun', 'sessions')}
        value={clampWeeklyGoal(prefs.weekly_goal, 'meditate')}
        accent={MEDITATE_ACCENT}
        onChange={(n) => save({ weekly_goal: n })}
      />
      <Copy id="meditate.settings.goalNote" style={ms.muted}>
        Shown on Today as “2 of 5 this week”. A week that falls short gets the usual one-tap “what got in the way?”.
      </Copy>

      <ListGroup
        title={t('meditate.settings.bell.title', 'The bell')}
        footer={t('meditate.settings.bell.footer', 'The bell is your phone’s notification sound, so the silent switch, a Focus mode or Do Not Disturb can quiet it.')}
      >
        <ListRow
          title={t(`meditate.settings.bell.status.${bellPermission}`, BELL_STATUS[bellPermission])}
          icon={{
            name: bellPermission === 'granted' ? 'notifications' : 'notifications-off',
            color: bellPermission === 'denied' ? Colors.danger : MEDITATE_ACCENT,
          }}
        />
        {bellPermission === 'denied' && (
          <ListRow title={t('meditate.settings.openSettings', 'Open Settings')} tint="accent" chevron={false} onPress={() => Linking.openSettings()} />
        )}
      </ListGroup>

      <ListGroup
        title={t('meditate.settings.nsdr.title', 'NSDR recordings')}
        footer={
          prefs.nsdr_links.length === 0 && !adding
            ? t('meditate.settings.nsdr.none', 'None yet. Do it on NSDR opens the one you pick.')
            : undefined
        }
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
        {!adding && <ListRow title={t('meditate.settings.addRecording', 'Add a recording')} tint="accent" chevron={false} onPress={() => setAdding(true)} />}
      </ListGroup>
      {adding && <NsdrLinkForm onAdd={addRecording} onCancel={() => setAdding(false)} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginVertical: -Spacing.sm },
});

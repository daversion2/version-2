import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { useCopy } from '../../context/CopyContext';
import { useAuth } from '../../context/AuthContext';
import { setCloseOutReminder } from '../../services/closeOutReminder';
import { CLOSEOUT_TIMES, DEFAULT_CLOSEOUT_TIME, formatReminderTime } from '../../services/closeOutTimes';
import { showAlert } from '../../utils/alert';
import { Button } from '../common/Button';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Settings: the "Close out the day" reminder's time, or off. */
export const CloseOutReminderSheet: React.FC<Props> = ({ visible, onClose }) => {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const { user, userProfile, refreshProfile } = useAuth();
  const saved = userProfile?.closeout_reminder_time ?? null;
  const [time, setTime] = useState<string | null>(saved);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTime(saved ?? DEFAULT_CLOSEOUT_TIME);
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const on = await setCloseOutReminder(user.uid, time);
      await refreshProfile();
      if (time && !on) {
        showAlert(
          t('settings.reminder.blockedTitle', 'Notifications are off'),
          t('settings.reminder.blockedBody', 'Turn on notifications for Neuro-Nudge in your phone’s Settings to get the reminder.')
        );
      }
      onClose();
    } catch (e: any) {
      showAlert(t('settings.reminder.errorTitle', 'Couldn’t save'), e?.message ?? '');
      setSaving(false);
    }
  };

  const options: (string | null)[] = [...CLOSEOUT_TIMES, null];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm }]}>
          <Text style={styles.title} accessibilityRole="header">
            {t('settings.reminder.title', 'Evening reminder')}
          </Text>
          <Text style={styles.body}>
            {t('settings.reminder.body', 'Once a day: a nudge to grade the effort and plan tomorrow’s session.')}
          </Text>
          <View style={styles.chips}>
            {options.map((opt) => {
              const on = opt === time;
              return (
                <TouchableOpacity
                  key={opt ?? 'off'}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => setTime(opt)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {opt ? formatReminderTime(opt) : t('settings.reminder.off', 'Off')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Button title={t('settings.reminder.save', 'Save')} onPress={save} loading={saving} disabled={saving} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  body: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primary + '0D' },
  chipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  chipTextOn: { color: Colors.primary },
});

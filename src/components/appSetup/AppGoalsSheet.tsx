import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { useCopy } from '../../context/CopyContext';
import { useAuth } from '../../context/AuthContext';
import { AppSetup, loadAppSetup, saveAppSetup } from '../../services/appSetup';
import { showAlert } from '../../utils/alert';
import { Button } from '../common/Button';
import { AppGoalRows, AppToggleList } from './AppSetupParts';

interface Props {
  visible: boolean;
  /**
   * 'once': the one-time sheet on Today for accounts from before goals. It
   * can't be swiped away, only saved (its numbers are already sensible).
   * 'edit': opened from Settings, with Cancel.
   */
  mode: 'once' | 'edit';
  onClose: () => void;
}

/** Which apps are on and each one's weekly goal. Saves through services/appSetup.ts. */
export const AppGoalsSheet: React.FC<Props> = ({ visible, mode, onClose }) => {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const { user, userProfile, refreshProfile } = useAuth();
  const [setup, setSetup] = useState<AppSetup | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setSetup(null);
    setSaving(false);
    loadAppSetup(user.uid, userProfile)
      .then(setSetup)
      .catch((e) => {
        console.warn('Loading app goals failed:', e);
        if (mode === 'edit') onClose();
      });
    // Loaded once per opening; a profile refresh mid-edit mustn't reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, user]);

  const save = async () => {
    if (!user || !setup || saving) return;
    setSaving(true);
    try {
      await saveAppSetup(user.uid, setup, { includeStart: false });
      await refreshProfile();
      onClose();
    } catch (e: any) {
      showAlert(t('appSetup.error.title', 'Couldn’t save'), e?.message ?? t('appSetup.error.retry', 'Please try again.'));
      setSaving(false);
    }
  };

  const cancel = mode === 'edit' ? onClose : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cancel ?? (() => {})}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={cancel} disabled={!cancel} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm }]}>
          <View style={styles.head}>
            <Text style={styles.title} accessibilityRole="header">
              {mode === 'once'
                ? t('appSetup.sheet.onceTitle', 'Set your weekly goals')
                : t('appSetup.sheet.editTitle', 'Your apps and goals')}
            </Text>
            {cancel && (
              <TouchableOpacity onPress={cancel} accessibilityRole="button">
                <Text style={styles.cancel}>{t('appSetup.sheet.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {mode === 'once' && (
            <Text style={styles.body}>
              {t(
                'appSetup.sheet.onceBody',
                'Today now counts your sessions in each app. Pick numbers you can hit this week. You can change them any time in Settings.'
              )}
            </Text>
          )}

          {!setup ? (
            <ActivityIndicator color={Colors.primary} style={styles.loading} />
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              <Text style={styles.label}>{t('appSetup.sheet.goalsLabel', 'Weekly goals')}</Text>
              <AppGoalRows
                hidden={setup.hidden}
                goals={setup.goals}
                onGoals={(goals) => setSetup({ ...setup, goals })}
              />
              <Text style={[styles.label, styles.labelGap]}>{t('appSetup.sheet.appsLabel', 'Apps on Today')}</Text>
              <AppToggleList hidden={setup.hidden} onChange={(hidden) => setSetup({ ...setup, hidden })} />
            </ScrollView>
          )}

          <Button
            title={t('appSetup.sheet.save', 'Save')}
            onPress={save}
            disabled={!setup || saving}
            loading={saving}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    maxHeight: '88%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  cancel: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.primary },
  body: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, lineHeight: 20 },
  loading: { paddingVertical: Spacing.xl },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: Spacing.sm },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  labelGap: { marginTop: Spacing.lg },
});

import React, { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, TextStyles } from '../../constants/theme';
import { START_LEVELS } from '../../constants/resistance';
import { useCopy } from '../../context/CopyContext';
import { OverrideInfoButton } from '../home/OverrideInfoButton';

// =============================================================================
// THE OVERRIDE, ON START (constants/resistance.ts, "TWO RATINGS").
//
// Every Start in Workouts and Meditate goes through this sheet: "How hard is
// it to start?", and the three answers ARE the start button — tapping one
// saves the override onto the session and starts it. Asked here because this
// is where the resistance is; asked at the end it was remembered, and a good
// session made the start look easier than it was.
//
// Backdrop or Cancel: nothing starts and nothing is saved.
// =============================================================================

interface Props {
  visible: boolean;
  /** "Workouts", "Meditate". */
  appName: string;
  accent: string;
  onPick: (level: number) => void;
  onCancel: () => void;
}

export const OverrideStartSheet: React.FC<Props> = ({ visible, appName, accent, onPick, onCancel }) => {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onCancel} accessibilityLabel={t('start.override.cancel', 'Cancel')} />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md }]}
          accessibilityViewIsModal
        >
          <View style={styles.grabber} />
          <View style={styles.info}>
            <OverrideInfoButton />
          </View>
          <View style={styles.head}>
            <Text style={[styles.kicker, { color: accent }]}>
              {t('start.override.kicker', 'Override')} · {appName}
            </Text>
            <Text style={styles.question} accessibilityRole="header">
              {t('start.override.question', 'How hard is it to start?')}
            </Text>
          </View>
          <View style={styles.levels}>
            {START_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={styles.level}
                onPress={() => onPick(level.value)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${level.value}, ${t(`start.override.${level.value}.label`, level.label)}. ${t(
                  `start.override.${level.value}.sub`,
                  level.sublabel
                )}. Starts.`}
              >
                <Text style={[styles.number, { color: accent }]}>{level.value}</Text>
                <View style={styles.levelText}>
                  <Text style={styles.label}>{t(`start.override.${level.value}.label`, level.label)}</Text>
                  <Text style={styles.sub}>{t(`start.override.${level.value}.sub`, level.sublabel)}</Text>
                </View>
                <Text style={[styles.go, { color: accent }]}>{t('start.override.go', 'Start')} ›</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>{t('start.override.hint', 'Tap one to start.')}</Text>
          <TouchableOpacity onPress={onCancel} style={styles.cancel} accessibilityRole="button">
            <Text style={styles.cancelText}>{t('start.override.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/** iOS drops what's presented while a modal is still animating away. */
const SHEET_EXIT_MS = 300;

/**
 * `ask(start)` opens the sheet; picking a level closes it and then calls
 * `start(level)`. Render `sheet` once in the screen.
 */
export const useOverrideStart = (appName: string, accent: string) => {
  const [visible, setVisible] = useState(false);
  const pending = useRef<((level: number) => void) | null>(null);

  const ask = useCallback((start: (level: number) => void) => {
    pending.current = start;
    setVisible(true);
  }, []);

  const pick = (level: number) => {
    const start = pending.current;
    pending.current = null;
    setVisible(false);
    if (start) setTimeout(() => start(level), SHEET_EXIT_MS);
  };

  const cancel = () => {
    pending.current = null;
    setVisible(false);
  };

  const sheet = (
    <OverrideStartSheet visible={visible} appName={appName} accent={accent} onPick={pick} onCancel={cancel} />
  );
  return { ask, sheet };
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: Colors.separator },
  info: { position: 'absolute', top: Spacing.md, right: Spacing.md, zIndex: 1 },
  head: { gap: Spacing.xs, paddingTop: Spacing.xs },
  kicker: { ...TextStyles.footnote, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  question: { ...TextStyles.title2, color: Colors.dark },
  levels: { gap: 10 },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 64,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    backgroundColor: Colors.lightGray,
  },
  number: { ...TextStyles.title1, width: 28, textAlign: 'center' },
  levelText: { flex: 1, gap: 2 },
  label: { ...TextStyles.headline, color: Colors.dark },
  sub: { ...TextStyles.subhead, color: Colors.label2 },
  go: { ...TextStyles.subhead, fontWeight: '700' },
  hint: { ...TextStyles.footnote, color: Colors.gray, textAlign: 'center' },
  cancel: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md },
  cancelText: { ...TextStyles.body, color: Colors.gray },
});

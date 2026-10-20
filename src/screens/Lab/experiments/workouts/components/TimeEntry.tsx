import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing } from '../../../../../constants/theme';
import { NumberStepper } from './NumberStepper';

interface Props {
  seconds: number;
  onChange: (seconds: number) => void;
  size?: 'large' | 'small';
  /** Shown before "min" / "sec", e.g. "Target". */
  labelPrefix?: string;
}

const MAX_SEC = 24 * 3600;
const clamp = (n: number) => Math.min(MAX_SEC, Math.max(1, Math.round(n)));

/**
 * A finishing time as minutes and seconds — a 28-minute 5K is two taps and a
 * number, not 336 taps of "+5 seconds". Seconds step by 5 and roll into the
 * minutes either way.
 */
export const TimeEntry: React.FC<Props> = ({ seconds, onChange, size = 'large', labelPrefix }) => {
  const s = Math.max(0, Math.round(seconds));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  const label = (unit: string) => (labelPrefix ? `${labelPrefix} ${unit}` : unit);
  return (
    <View style={styles.row}>
      <NumberStepper
        size={size}
        label={label('Min')}
        value={min}
        onDecrement={() => onChange(clamp(s - 60))}
        onIncrement={() => onChange(clamp(s + 60))}
        onSubmitValue={(v) => onChange(clamp(Math.round(v) * 60 + sec))}
      />
      <NumberStepper
        size={size}
        label={label('Sec')}
        value={sec}
        onDecrement={() => onChange(clamp(s - 5))}
        onIncrement={() => onChange(clamp(s + 5))}
        onSubmitValue={(v) => onChange(clamp(min * 60 + Math.min(59, Math.round(v))))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
});

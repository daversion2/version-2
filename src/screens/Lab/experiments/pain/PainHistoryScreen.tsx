import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PainPlan, PainStackParamList } from '../../../../types/pain';
import { SELF_EXPERIMENT_LINE } from '../../../../data/painPlan';
import { dayLabel, planResult, recentDays, shortDate, sortPlans } from '../../../../services/painMath';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { Stepper } from '../../../../components/common/Stepper';
import { usePain } from './PainContext';
import { CheckInSheet, CheckInTarget } from './components/CheckInSheet';
import { itemTitles, ps, ratingLabel } from './components/painStyle';

type Props = NativeStackScreenProps<PainStackParamList, 'PainHistory'>;

/** How many days of check-ins History lists. */
const HISTORY_DAYS = 28;

const STATUS: Record<'better' | 'same' | 'worse' | 'mixed', string> = {
  better: 'Better',
  same: 'No clear change',
  worse: 'Worse',
  mixed: 'Mixed',
};

const planStatus = (plan: PainPlan): string => {
  if (plan.status === 'active') return 'In progress';
  if (plan.status === 'ended') return 'Ended early';
  const r = planResult(plan);
  return r ? STATUS[r.verdict] : '';
};

/** Past plans, the last four weeks of check-ins (tap to edit), and the one setting. */
export const PainHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { days, plans, today, prefs, updatePrefs } = usePain();
  const [target, setTarget] = useState<CheckInTarget | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  const sortedPlans = useMemo(() => sortPlans(plans), [plans]);
  const recent = useMemo(() => recentDays(days, today, HISTORY_DAYS), [days, today]);

  const edit = (date: string) => {
    setSheetKey((k) => k + 1);
    setTarget({ date });
  };

  return (
    <View style={ps.screen}>
      <ScrollView contentContainerStyle={ps.scroll}>
        <ListGroup title="Plans">
          {sortedPlans.length === 0 ? (
            <ListRow title="No plans yet" />
          ) : (
            sortedPlans.map((p) => (
              <ListRow
                key={p.id}
                title={`Plan ${p.number} · ${shortDate(p.start_date)}`}
                subtitle={`${itemTitles(p.items)} · ${p.weeks} weeks`}
                value={planStatus(p)}
                onPress={() => navigation.navigate('PainResults', { planId: p.id })}
              />
            ))
          )}
        </ListGroup>

        <ListGroup title="Check-ins" footer={recent.length ? 'The last 4 weeks. Tap one to change or delete it.' : undefined}>
          {recent.length === 0 ? (
            <ListRow title="Nothing logged yet" />
          ) : (
            recent.map((d) => (
              <ListRow
                key={d.date}
                title={dayLabel(d.date, today)}
                subtitle={[d.done.length ? itemTitles(d.done) : undefined, ratingLabel(d.resistance)]
                  .filter(Boolean)
                  .join(' · ') || undefined}
                value={`${d.pain}/10`}
                onPress={() => edit(d.date)}
              />
            ))
          )}
        </ListGroup>

        <ListGroup title="Weekly goal" footer="Days with every item on your plan done, Monday to Sunday.">
          <ListRow
            title="Plan days a week"
            right={
              <Stepper
                value={prefs.weekly_goal}
                onChange={(weekly_goal) => updatePrefs({ weekly_goal })}
                min={1}
                max={7}
                accessibilityLabel="Plan days a week"
              />
            }
          />
        </ListGroup>

        <Text style={[ps.muted, ps.centerText]}>{SELF_EXPERIMENT_LINE}</Text>
      </ScrollView>

      <CheckInSheet key={sheetKey} target={target} onClose={() => setTarget(null)} />
    </View>
  );
};

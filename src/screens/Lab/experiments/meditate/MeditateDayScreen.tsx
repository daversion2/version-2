import React, { useLayoutEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Spacing } from '../../../../constants/theme';
import type { MeditateStackParamList } from '../../../../types/meditate';
import { buildMeditateDay, wasLoggedAfter } from '../../../../services/meditateWeek';
import { formatMinutes } from '../../../../services/sessionTimer';
import { describeRating } from '../../../../services/workoutWeek';
import { useMeditate } from './MeditateContext';
import { ms } from './components/meditateStyle';
import { meditateWeekdayName, useMeditateLogs } from './components/MeditateWeekParts';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<MeditateStackParamList, 'MeditateDay'>;

const clock = (iso: string): string => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** One day from the Week screen: each session with its length and both ratings. */
export const MeditateDayScreen: React.FC<Props> = ({ navigation, route }) => {
  const { date } = route.params;
  const t = useCopy();
  const { sessions, userId } = useMeditate();
  const logs = useMeditateLogs(userId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: meditateWeekdayName(date) });
  }, [navigation, date]);

  const day = useMemo(() => buildMeditateDay({ sessions, logs, date, now: new Date() }), [sessions, logs, date]);

  if (day.sessions.length === 0) {
    return (
      <ScrollView style={ms.screen} contentContainerStyle={ms.scroll}>
        <View style={ms.card}>
          <Copy id={day.ahead ? 'meditate.day.stillToCome' : 'meditate.day.restDay'} style={ms.title}>
            {day.ahead ? 'Still to come' : 'Rest day'}
          </Copy>
          <Copy id="meditate.day.noSession" style={ms.muted}>No session logged on this day.</Copy>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={ms.screen} contentContainerStyle={ms.scroll}>
      {day.sessions.map((d, i) => {
        const s = d.session;
        const ratings = [
          describeRating(d.ratings.start) ? t('meditate.day.ratingStart', 'Getting started {n}', { n: d.ratings.start ?? '' }) : null,
          describeRating(d.ratings.stay) ? t('meditate.day.ratingStay', 'Staying with it {n}', { n: d.ratings.stay ?? '' }) : null,
        ].filter(Boolean);
        return (
          <View key={s?.id ?? `logged-${i}`} style={[ms.card, styles.session]}>
            <View style={styles.head}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={ms.title}>{d.name}</Text>
                <Text style={ms.muted}>
                  {s
                    ? [
                        wasLoggedAfter(s) ? t('meditate.day.loggedAfter', 'Logged after') : clock(s.started_at),
                        formatMinutes(s.duration_sec),
                        s.ended_early ? t('meditate.day.endedEarlyOf', 'ended early of {planned}', { planned: formatMinutes(s.planned_sec) }) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : t('meditate.day.noDetails', 'Logged without details')}
                </Text>
              </View>
              {!!s && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('MeditateEditSession', { sessionId: s.id })}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${d.name}`}
                >
                  <Copy id="meditate.day.edit" style={ms.link}>Edit</Copy>
                </TouchableOpacity>
              )}
            </View>
            {ratings.length > 0 && <Text style={styles.ratings}>{ratings.join(' · ')}</Text>}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  session: { gap: Spacing.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  ratings: { ...ms.lead, paddingHorizontal: 0 },
});

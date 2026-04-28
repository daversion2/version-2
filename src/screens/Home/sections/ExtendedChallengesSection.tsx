import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { ProgressBar } from '../../../components/challenge/ProgressBar';
import { BuddyChallengeStatusBadge } from '../../../components/challenge/BuddyChallengeStatusBadge';
import { getCurrentDayNumber } from '../../../services/challenges';
import { HomeSectionProps } from './types';

export const ExtendedChallengesSection: React.FC<HomeSectionProps> = ({ data, callbacks }) => {
  const { extendedChallenges, buddyChallenges } = data;

  if (extendedChallenges.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>Extended Challenges</Text>
      {extendedChallenges.map((extendedChallenge) => {
        if (!extendedChallenge.milestones || !extendedChallenge.start_date) return null;
        const buddyInfo = extendedChallenge.is_buddy_challenge && extendedChallenge.buddy_challenge_id
          ? buddyChallenges.find(b => b.id === extendedChallenge.buddy_challenge_id)
          : null;
        const partnerStatus = buddyInfo
          ? (extendedChallenge.user_id === buddyInfo.inviter_id ? buddyInfo.partner_status : buddyInfo.inviter_status)
          : null;
        const currentDay = getCurrentDayNumber(extendedChallenge.start_date);
        const todayMilestone = extendedChallenge.milestones.find(m => m.day_number === currentDay);
        const checkedInToday = todayMilestone?.completed;

        return (
          <Card
            key={extendedChallenge.id}
            style={styles.extendedCard}
            onPress={() => callbacks.onNavigate('ExtendedChallengeProgress', { challenge: extendedChallenge })}
          >
            <View style={styles.extendedHeader}>
              <Text style={styles.challengeName}>{extendedChallenge.name}</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  callbacks.onNavigate('EditChallenge', { challenge: extendedChallenge });
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil" size={18} color={Colors.gray} />
              </TouchableOpacity>
            </View>
            {extendedChallenge.is_buddy_challenge && partnerStatus && (
              <BuddyChallengeStatusBadge
                partnerUsername={extendedChallenge.buddy_partner_username}
                partnerStatus={partnerStatus}
              />
            )}
            <Text style={styles.extendedDayInfo}>
              Day {Math.min(currentDay, extendedChallenge.milestones.length)} of {extendedChallenge.milestones.length}
            </Text>
            <ProgressBar
              progress={extendedChallenge.milestones.filter(m => m.completed).length / extendedChallenge.milestones.length}
              showPercentage={false}
            />
            <View style={styles.checkInStatus}>
              <Ionicons
                name={checkedInToday ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={checkedInToday ? Colors.success : Colors.gray}
              />
              <Text style={[styles.checkInText, checkedInToday && styles.checkInDone]}>
                {checkedInToday ? 'Checked in today!' : "Today's check-in: Not done"}
              </Text>
            </View>
            <Button
              title={checkedInToday ? 'View Progress' : 'Check In Now'}
              variant="outline"
              onPress={() => callbacks.onNavigate('ExtendedChallengeProgress', { challenge: extendedChallenge })}
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  extendedCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.sm,
  },
  extendedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    flex: 1,
  },
  editBtn: {
    padding: Spacing.xs,
  },
  extendedDayInfo: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  checkInStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  checkInText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  checkInDone: {
    color: Colors.success,
  },
});

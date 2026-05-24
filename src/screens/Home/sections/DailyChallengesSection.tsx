import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { CountdownTimer } from '../../../components/challenge/CountdownTimer';
import { BuddyChallengeStatusBadge } from '../../../components/challenge/BuddyChallengeStatusBadge';
import { ACTION_TYPES } from '../../../constants/challengeLibrary';
import { HomeSectionProps } from './types';

export const DailyChallengesSection: React.FC<HomeSectionProps> = ({ data, callbacks, refs }) => {
  const { activeChallenges, buddyChallenges } = data;
  const totalCompleted = data.totalHabitsCompleted;
  const challengesUnlocked = totalCompleted >= 3;

  return (
    <>
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name={challengesUnlocked ? 'flame-outline' : 'lock-closed-outline'} size={28} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Growth Challenges</Text>
            <Text style={styles.headerSubtitle}>
              {challengesUnlocked
                ? 'Challenge yourself and reflect on what you learn'
                : 'Complete 3 habits to unlock challenges'}
            </Text>
          </View>
        </View>
      </Card>

      {!challengesUnlocked ? (
        <Card style={styles.lockedCard}>
          <View style={styles.lockedRow}>
            <Ionicons name="lock-closed" size={22} color={Colors.gray} />
            <View style={{ flex: 1 }}>
              <Text style={styles.lockedTitle}>Challenges unlock after 3 habit completions</Text>
              <Text style={styles.lockedBody}>
                Keep completing your habits to unlock challenges. You've completed {totalCompleted} of 3.
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min((totalCompleted / 3) * 100, 100)}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{totalCompleted} / 3 habits</Text>
        </Card>
      ) : activeChallenges.length > 0 ? (
        activeChallenges.map((challenge) => {
          const buddyInfo = challenge.is_buddy_challenge && challenge.buddy_challenge_id
            ? buddyChallenges.find(b => b.id === challenge.buddy_challenge_id)
            : null;
          const partnerStatus = buddyInfo
            ? (challenge.user_id === buddyInfo.inviter_id ? buddyInfo.partner_status : buddyInfo.inviter_status)
            : null;

          return (
            <Card
              key={challenge.id}
              style={styles.challengeCard}
              onPress={() => callbacks.onNavigate('CompleteChallenge', { challenge })}
            >
              <View style={styles.challengeHeader}>
                <Text style={styles.challengeName}>{challenge.name}</Text>
                <View style={styles.badgeRow}>
                  {challenge.action_type && (
                    <View style={[
                      styles.actionBadge,
                      { backgroundColor: challenge.action_type === 'resist' ? Colors.secondary + '20' : Colors.primary + '20' }
                    ]}>
                      <Text style={[
                        styles.actionBadgeText,
                        { color: challenge.action_type === 'resist' ? Colors.secondary : Colors.primary }
                      ]}>
                        {ACTION_TYPES[challenge.action_type]?.icon} {ACTION_TYPES[challenge.action_type]?.label}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      callbacks.onNavigate('EditChallenge', { challenge });
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="pencil" size={18} color={Colors.gray} />
                  </TouchableOpacity>
                  <View style={styles.diffBadge}>
                    <Text style={styles.diffText}>{challenge.difficulty_expected}</Text>
                  </View>
                </View>
              </View>
              {challenge.is_buddy_challenge && partnerStatus && (
                <BuddyChallengeStatusBadge
                  partnerUsername={challenge.buddy_partner_username}
                  partnerStatus={partnerStatus}
                />
              )}
              {challenge.description ? (
                <Text style={styles.challengeDesc}>{challenge.description}</Text>
              ) : null}
              {challenge.deadline ? (
                <View style={{ marginTop: Spacing.sm }}>
                  <CountdownTimer deadline={challenge.deadline} variant="compact" />
                </View>
              ) : null}
              <Text style={styles.tapHint}>Tap to complete</Text>
            </Card>
          );
        })
      ) : (
        <Card>
          <Text style={styles.noChallenge}>No active challenge</Text>
          <View ref={refs?.challengeBtnRef} collapsable={false}>
            <Button
              title="Start Today's Challenge"
              onPress={() => callbacks.onNavigate('StartChallenge')}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </Card>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: Colors.secondary,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  headerSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white + 'CC',
    marginTop: 2,
  },
  challengeCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
    marginBottom: Spacing.sm,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  actionBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
  },
  editBtn: {
    padding: Spacing.xs,
  },
  challengeName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    flex: 1,
  },
  diffBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  challengeDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  tapHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    marginTop: Spacing.sm,
  },
  noChallenge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
  },
  lockedCard: {
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.gray,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  lockedTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: 2,
  },
  lockedBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 18,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
  },
  progressLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
  },
});

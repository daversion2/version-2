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

  return (
    <>
      <Text style={styles.sectionTitle}>Today's Challenges</Text>

      {activeChallenges.length > 0 ? (
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
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
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
});

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { BuddyChallenge } from '../../types';
import { getPendingInvites, acceptBuddyChallenge, declineBuddyChallenge } from '../../services/buddyChallenge';
import { showAlert } from '../../utils/alert';

type Props = NativeStackScreenProps<any, 'BuddyInvites'>;

export const BuddyInvitesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<BuddyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!user) return;
    try {
      const pending = await getPendingInvites(user.uid);
      setInvites(pending);
    } catch (e) {
      console.error('Error loading invites:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadInvites();
    }, [loadInvites])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvites();
    setRefreshing(false);
  };

  const handleAccept = async (invite: BuddyChallenge) => {
    if (!user) return;
    setProcessingId(invite.id);
    try {
      await acceptBuddyChallenge(user.uid, invite.id);
      showAlert('Challenge Accepted!', `You and ${invite.inviter_username || 'your teammate'} are now doing "${invite.challenge_name}" together.`);
      // Remove from list
      setInvites(prev => prev.filter(i => i.id !== invite.id));
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to accept invite.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invite: BuddyChallenge) => {
    if (!user) return;
    setProcessingId(invite.id);
    try {
      await declineBuddyChallenge(user.uid, invite.id);
      // Quietly remove from list
      setInvites(prev => prev.filter(i => i.id !== invite.id));
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to decline invite.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {invites.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="mail-open-outline" size={48} color={Colors.gray} />
              <Text style={styles.emptyTitle}>No Invites</Text>
              <Text style={styles.emptyDesc}>
                When a teammate invites you to a buddy challenge, it'll show up here.
              </Text>
            </View>
          </Card>
        ) : (
          invites.map((invite) => {
            const isProcessing = processingId === invite.id;
            const isExtended = invite.challenge_type === 'extended';

            return (
              <Card key={invite.id} style={styles.inviteCard}>
                <View style={styles.inviteHeader}>
                  <View style={styles.fromRow}>
                    <Ionicons name="person" size={16} color={Colors.primary} />
                    <Text style={styles.fromText}>
                      From {invite.inviter_username || 'a teammate'}
                    </Text>
                  </View>
                  {isExtended && (
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {invite.duration_days}-day
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.challengeName}>{invite.challenge_name}</Text>

                <View style={styles.metaRow}>
                  <View style={[styles.diffBadge]}>
                    <Text style={styles.diffText}>{invite.difficulty_expected}</Text>
                  </View>
                  <Text style={styles.categoryText}>{invite.category_id}</Text>
                </View>

                {invite.description ? (
                  <Text style={styles.description} numberOfLines={3}>
                    {invite.description}
                  </Text>
                ) : null}

                <View style={styles.buttonRow}>
                  <Button
                    title="Accept"
                    variant="primary"
                    onPress={() => handleAccept(invite)}
                    loading={isProcessing}
                    disabled={processingId !== null}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Decline"
                    variant="outline"
                    onPress={() => handleDecline(invite)}
                    disabled={processingId !== null}
                    style={styles.actionBtn}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inviteCard: {
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  fromRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  fromText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  typeBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  challengeName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  diffBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  categoryText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  emptyDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
  },
});

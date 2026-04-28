import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { getPendingCoachApplications, reviewCoachApplication } from '../../services/admin';
import { CoachApplication } from '../../types';

export const AdminCoachReviewScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState<CoachApplication[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const apps = await getPendingCoachApplications();
      setApplications(apps);
    } catch (err) {
      console.error('Error loading coach applications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = (app: CoachApplication) => {
    if (!user) return;
    Alert.alert(
      'Approve Coach',
      `Approve "${app.display_name}" as a coach? They'll be able to create and publish programs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingId(app.id);
            try {
              await reviewCoachApplication(app.id, true, user.uid);
              setApplications(prev => prev.filter(a => a.id !== app.id));
              Alert.alert('Approved', `${app.display_name} is now a coach.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to approve.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (app: CoachApplication) => {
    if (!user) return;
    Alert.prompt(
      'Reject Application',
      'Optionally provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason?: string) => {
            setProcessingId(app.id);
            try {
              await reviewCoachApplication(app.id, false, user.uid, reason);
              setApplications(prev => prev.filter(a => a.id !== app.id));
              Alert.alert('Rejected', 'Application has been rejected.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reject.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.sectionTitle}>
        Pending Applications ({applications.length})
      </Text>

      {applications.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={48} color={Colors.gray} />
          <Text style={styles.emptyText}>No pending applications</Text>
        </Card>
      ) : (
        applications.map(app => (
          <Card key={app.id} style={styles.appCard}>
            {/* Header */}
            <View style={styles.appHeader}>
              <View>
                <Text style={styles.appName}>{app.display_name}</Text>
                <Text style={styles.appUsername}>
                  @{app.username} {'\u2022'} {app.email}
                </Text>
              </View>
              <Text style={styles.dateText}>{formatDate(app.submitted_at)}</Text>
            </View>

            {/* Bio */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Bio</Text>
              <Text style={styles.detailText}>{app.bio}</Text>
            </View>

            {/* Credentials */}
            {app.credentials && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Credentials</Text>
                <Text style={styles.detailText}>{app.credentials}</Text>
              </View>
            )}

            {/* Website */}
            {app.website_url && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Website</Text>
                <Text style={styles.detailText}>{app.website_url}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              <Button
                title="Reject"
                onPress={() => handleReject(app)}
                variant="outline"
                style={styles.actionButton}
                disabled={processingId === app.id}
              />
              <Button
                title="Approve"
                onPress={() => handleApprove(app)}
                variant="primary"
                style={styles.actionButton}
                loading={processingId === app.id}
                disabled={processingId === app.id}
              />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  appCard: {
    marginBottom: Spacing.md,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  appName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: 2,
  },
  appUsername: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  dateText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  detailSection: {
    backgroundColor: Colors.lightGray,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: 4,
  },
  detailText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});

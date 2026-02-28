import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface Props {
  partnerUsername?: string;
  partnerStatus: string;
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending': return 'Invited';
    case 'active': return 'In Progress';
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    case 'declined': return 'Declined';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return Colors.success || '#4CAF50';
    case 'failed':
    case 'cancelled': return '#E53E3E';
    case 'pending': return Colors.secondary;
    default: return Colors.primary;
  }
};

export const BuddyChallengeStatusBadge: React.FC<Props> = ({ partnerUsername, partnerStatus }) => {
  const statusColor = getStatusColor(partnerStatus);

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: Colors.primary + '15' }]}>
        <Ionicons name="people" size={13} color={Colors.primary} />
        <Text style={styles.partnerText}>
          w/ {partnerUsername || 'Teammate'}
        </Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <Text style={[styles.statusText, { color: statusColor }]}>
        {getStatusLabel(partnerStatus)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  partnerText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: Spacing.xs,
  },
  statusText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
  },
});

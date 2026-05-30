import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { HomeSectionProps } from './types';

export const BuddyInvitesSection: React.FC<HomeSectionProps> = React.memo(({ data, callbacks }) => {
  if (data.pendingInvites <= 0) return null;
  return (
    <Card
      style={styles.inviteBanner}
      onPress={() => callbacks.onNavigate('BuddyInvites')}
    >
      <View style={styles.inviteRow}>
        <Ionicons name="people" size={20} color={Colors.secondary} />
        <Text style={styles.inviteText}>
          {data.pendingInvites} buddy challenge invite{data.pendingInvites > 1 ? 's' : ''}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  inviteBanner: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
    marginBottom: Spacing.sm,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inviteText: {
    flex: 1,
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
});

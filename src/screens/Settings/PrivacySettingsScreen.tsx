import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { getUser, updateInspirationFeedOptIn } from '../../services/users';

export const PrivacySettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inspirationFeedOptIn, setInspirationFeedOptIn] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      try {
        const userData = await getUser(user.uid);
        // Default to true if not set
        setInspirationFeedOptIn(userData?.inspiration_feed_opt_in !== false);
      } catch (error) {
        console.error('Error loading privacy settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [user]);

  const handleInspirationFeedToggle = async (value: boolean) => {
    if (!user || saving) return;
    setSaving(true);
    setInspirationFeedOptIn(value);
    try {
      await updateInspirationFeedOptIn(user.uid, value);
    } catch (error) {
      console.error('Error updating inspiration feed setting:', error);
      // Revert on error
      setInspirationFeedOptIn(!value);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionHeader}>Community Privacy</Text>

      <Card style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Share to Inspiration Feed</Text>
            <Text style={styles.settingDesc}>
              When you complete a challenge with difficulty 3 or higher, it may appear anonymously in the community Inspiration Feed to motivate others.
            </Text>
          </View>
          <Switch
            value={inspirationFeedOptIn}
            onValueChange={handleInspirationFeedToggle}
            trackColor={{ false: Colors.lightGray, true: Colors.primary }}
            thumbColor={Colors.white}
            disabled={saving}
          />
        </View>
      </Card>

      <Text style={styles.privacyNote}>
        Your name is never shown in the Inspiration Feed. Only the challenge category, difficulty level, and a brief teaser of the challenge name are shared.
      </Text>
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
  loadingText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  settingDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  privacyNote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 18,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
});

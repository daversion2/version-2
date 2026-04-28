import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { getMyCoachApplication, applyToBeCoach } from '../../services/coaches';
import { showAlert } from '../../utils/alert';
import { CoachApplication } from '../../types';

export const CoachApplicationScreen: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [existingApp, setExistingApp] = useState<CoachApplication | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [credentials, setCredentials] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!user) return;
        try {
          const app = await getMyCoachApplication(user.uid);
          setExistingApp(app);
        } catch (err) {
          console.error('Error loading coach application:', err);
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [user])
  );

  const handleSubmit = async () => {
    if (!user || !userProfile) return;

    if (!displayName.trim()) {
      showAlert('Missing Field', 'Please enter a display name.');
      return;
    }
    if (!bio.trim()) {
      showAlert('Missing Field', 'Please enter a bio.');
      return;
    }

    setSubmitting(true);
    try {
      await applyToBeCoach(user.uid, {
        username: userProfile.username || '',
        email: user.email || '',
        display_name: displayName.trim(),
        bio: bio.trim(),
        credentials: credentials.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
      });

      const app = await getMyCoachApplication(user.uid);
      setExistingApp(app);
      showAlert('Application Submitted', 'Your coach application is now under review.');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
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

  // Pending application — show status
  if (existingApp?.status === 'pending') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.statusCard}>
          <View style={styles.statusIconRow}>
            <Ionicons name="time-outline" size={48} color={Colors.secondary} />
          </View>
          <Text style={styles.statusTitle}>Application Under Review</Text>
          <Text style={styles.statusDesc}>
            Your coach application was submitted on{' '}
            {formatDate(existingApp.submitted_at)}. We'll review it shortly.
          </Text>
        </Card>

        <Card style={styles.detailCard}>
          <Text style={styles.detailLabel}>Display Name</Text>
          <Text style={styles.detailValue}>{existingApp.display_name}</Text>

          <Text style={styles.detailLabel}>Bio</Text>
          <Text style={styles.detailValue}>{existingApp.bio}</Text>

          {existingApp.credentials && (
            <>
              <Text style={styles.detailLabel}>Credentials</Text>
              <Text style={styles.detailValue}>{existingApp.credentials}</Text>
            </>
          )}

          {existingApp.website_url && (
            <>
              <Text style={styles.detailLabel}>Website</Text>
              <Text style={styles.detailValue}>{existingApp.website_url}</Text>
            </>
          )}
        </Card>
      </ScrollView>
    );
  }

  // Rejected application — show reason + allow re-apply
  if (existingApp?.status === 'rejected') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.statusCard}>
          <View style={styles.statusIconRow}>
            <Ionicons name="close-circle-outline" size={48} color={Colors.secondary} />
          </View>
          <Text style={styles.statusTitle}>Application Not Approved</Text>
          {existingApp.rejection_reason && (
            <Text style={styles.statusDesc}>
              Reason: {existingApp.rejection_reason}
            </Text>
          )}
          <Text style={[styles.statusDesc, { marginTop: Spacing.sm }]}>
            You can submit a new application below.
          </Text>
        </Card>
        {renderForm()}
      </ScrollView>
    );
  }

  // No application — show form
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.introCard}>
          <Ionicons name="school-outline" size={32} color={Colors.primary} />
          <Text style={styles.introTitle}>Become a Coach</Text>
          <Text style={styles.introDesc}>
            Create and publish willpower programs for the Neuro-Nudge community.
            Fill out the form below to apply.
          </Text>
        </Card>
        {renderForm()}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  function renderForm() {
    return (
      <View style={styles.formSection}>
        <InputField
          label="Display Name *"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="How you'll appear to users"
          maxLength={50}
        />

        <Text style={styles.fieldLabel}>Bio *</Text>
        <TextInput
          style={styles.textArea}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about your expertise and what programs you'd create"
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
          placeholderTextColor={Colors.gray}
        />

        <InputField
          label="Credentials (optional)"
          value={credentials}
          onChangeText={setCredentials}
          placeholder="e.g. Certified Life Coach, PhD Psychology"
          maxLength={200}
        />

        <InputField
          label="Website URL (optional)"
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          placeholder="https://yourwebsite.com"
          autoCapitalize="none"
          keyboardType="url"
          maxLength={200}
        />

        <Button
          title="Submit Application"
          onPress={handleSubmit}
          variant="primary"
          loading={submitting}
          disabled={submitting}
          style={{ marginTop: Spacing.md }}
        />
      </View>
    );
  }
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
  introCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  introTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  introDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  formSection: {
    marginTop: Spacing.sm,
  },
  fieldLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  textArea: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.white,
    minHeight: 100,
    marginBottom: Spacing.md,
  },
  statusCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  statusIconRow: {
    marginBottom: Spacing.sm,
  },
  statusTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  statusDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  detailCard: {
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  detailValue: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 22,
  },
});

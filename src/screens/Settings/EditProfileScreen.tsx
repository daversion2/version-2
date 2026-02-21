import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import {
  getUser,
  updateUsername,
  validateUsername,
  checkUsernameAvailable,
} from '../../services/users';
import { showAlert } from '../../utils/alert';

type Props = NativeStackScreenProps<any, 'EditProfile'>;

export const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const userData = await getUser(user.uid);
        if (userData?.username) {
          setUsername(userData.username);
          setOriginalUsername(userData.username);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (error) {
      setError('');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const trimmed = username.trim();

    // Check if username actually changed
    if (trimmed.toLowerCase() === originalUsername.toLowerCase()) {
      navigation.goBack();
      return;
    }

    // Validate format
    const validation = validateUsername(trimmed);
    if (!validation.valid) {
      setError(validation.error || 'Invalid username');
      return;
    }

    // Check availability
    setCheckingAvailability(true);
    try {
      const available = await checkUsernameAvailable(trimmed);
      if (!available && trimmed.toLowerCase() !== originalUsername.toLowerCase()) {
        setError('This username is already taken');
        setCheckingAvailability(false);
        return;
      }
    } catch (err) {
      setError('Error checking username availability');
      setCheckingAvailability(false);
      return;
    }
    setCheckingAvailability(false);

    // Save the new username
    setSaving(true);
    try {
      await updateUsername(user.uid, trimmed);
      await refreshProfile();
      showAlert('Success', 'Username updated successfully');
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Failed to update username');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = username.trim().toLowerCase() !== originalUsername.toLowerCase();
  const isValid = username.trim().length >= 3;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <InputField
          value={username}
          onChangeText={handleUsernameChange}
          placeholder="Enter username"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Text style={styles.hintText}>
            3-20 characters, letters, numbers, and underscores only
          </Text>
        )}
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          title="Save Changes"
          onPress={handleSave}
          disabled={!hasChanges || !isValid || saving || checkingAvailability}
          loading={saving || checkingAvailability}
          style={styles.saveButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    paddingTop: Spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: '#D32F2F',
    marginTop: Spacing.sm,
  },
  hintText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  saveButton: {
    width: '100%',
  },
});

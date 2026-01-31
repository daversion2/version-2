import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { InputField } from '../../components/common/InputField';
import { Button } from '../../components/common/Button';
import { signIn } from '../../services/auth';

type Props = NativeStackScreenProps<any, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>NEURO-NUDGE</Text>
        <Text style={styles.subtitle}>Keep Moving Forward</Text>

        <View style={styles.form}>
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Your password"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title="Sign In" onPress={handleLogin} loading={loading} />

          <Button
            title="Create Account"
            onPress={() => navigation.navigate('Signup')}
            variant="outline"
            style={{ marginTop: Spacing.sm }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  title: {
    fontFamily: Fonts.accent,
    fontSize: FontSizes.hero,
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  form: { gap: Spacing.xs },
  error: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});
